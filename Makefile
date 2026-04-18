
grammars/%.json: grammars/%.js
	node -e 'console.log(JSON.stringify(eval('"'"'('"'"'+fs.readFileSync("$<").toString()+'"'"')'"'"'),null,2))' >$@

# Render any grammar to PDF via graphviz:  make pdf/dunjs-dungeon.pdf
pdf/%.pdf: grammars/%.js
	@mkdir -p pdf
	bin/transform.js -g $< --no-llm -q -d pdf/$*.dot
	dot -Tpdf pdf/$*.dot -o $@

# Same, but with a specific RNG seed:  make pdf/dunjs-dungeon.42.pdf SEED=42
pdf/%.$(SEED).pdf: grammars/%.js
	@mkdir -p pdf
	bin/transform.js -g $< --no-llm -q -s $(SEED) -d pdf/$*.$(SEED).dot
	dot -Tpdf pdf/$*.$(SEED).dot -o $@

graphs/$(SIZE)x$(SIZE).json:
	bin/lattice.js -s $(SIZE) >$@

graphs/cyclic.$(SIZE)x$(SIZE).json:
	bin/lattice.js -s $(SIZE) >$@

graphs/lev$(SIZE).json: graphs/$(SIZE)x$(SIZE).json
	bin/transform.js -i $< -g grammars/level.json >$@

rebuild$(SIZE):
	rm graphs/lev$(SIZE).json
	biomake graphs/lev$(SIZE).json
	bin/graph2dot.js -o graphs/lev$(SIZE).json


# Generate play/graph.js from a specific seed:  make play/graph.js SEED=42
# Writes `window.GRAPH = {...};` so play/index.html can load the graph
# without a server (works over file://).
#
# Optional env vars for debug-time builds:
#   PLACEHOLDER=1   —  narrator slots emit [theme:macro#ctx] tags
#   PASSAGE_ONLY=1  —  skip monster/puzzle refinement + mini-game expansion
#   NO_FLAVOR=1     —  keep monster/puzzle edges but don't expand them
#   THEME=<name>    —  pin the theme (see `bin/transform.js --list-themes`)
SEED ?= 42
PLAY_OPTS :=
ifeq ($(PLACEHOLDER),1)
  PLAY_OPTS += --placeholder
else
  PLAY_OPTS += --no-llm
endif
ifeq ($(PASSAGE_ONLY),1)
  PLAY_OPTS += --passage-only
endif
ifeq ($(NO_FLAVOR),1)
  PLAY_OPTS += --no-flavor
endif
ifdef THEME
  PLAY_OPTS += --theme $(THEME)
endif

play/graph.js: grammars/dunjs-dungeon.js dungeon-primitives.js narrator.js index.js subgraph.js themes.js debug-opts.js
	@mkdir -p play
	@printf 'window.GRAPH = ' > $@
	bin/transform.js -g $< -q -s $(SEED) $(PLAY_OPTS) -o /dev/stdout >> $@
	@printf ';\n' >> $@

# README
README.md: bin/transform.js
	bin/transform.js -h | perl -pe 's/</&lt;/g;s/>/&gt;/g;' | perl -e 'open FILE,"<README.md";while(<FILE>){last if/<pre>/;print}close FILE;print"<pre><code>\n";while(<>){print};print"</code></pre>\n"' >temp.md
	mv temp.md $@
