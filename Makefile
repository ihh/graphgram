
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
#   SONNET=1        —  use Anthropic Sonnet via API to generate real prose
#                      (requires ANTHROPIC_API_KEY in .env)
#   MODEL=NAME      —  model for --sonnet (default claude-sonnet-4-6)
#   PASSAGE_ONLY=1  —  skip monster/puzzle refinement + mini-game expansion
#   NO_FLAVOR=1     —  keep monster/puzzle edges but don't expand them
#   THEME=<name>    —  pin the theme (see `bin/transform.js --list-themes`)
SEED ?= 42
PLAY_OPTS :=
ifeq ($(SONNET),1)
  PLAY_OPTS += --sonnet
  ifdef MODEL
    PLAY_OPTS += --model $(MODEL)
  endif
else ifeq ($(PLACEHOLDER),1)
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

# ---------------------------------------------------------------------------
# Worked examples and the GitHub Pages site.
#
# GitHub Pages serves this repo from master:/docs, so the site is committed as
# static files. `make site` regenerates all of it; `make examples` regenerates
# the exported artefacts under out/.
# ---------------------------------------------------------------------------

EXAMPLES := dag-plain dag-locked maze-plain maze-locked mystery-daily
FORMATS  := ir twine choicescript inform7

# Every example, every format, at its canonical seed.
#   make examples
examples:
	@mkdir -p out/examples
	@for e in $(EXAMPLES); do \
	  bin/story.js --example $$e --format ir      --out out/examples/$$e.ir.json   -q; \
	  bin/story.js --example $$e --format twine   --out out/examples/$$e.twee      -q; \
	  bin/story.js --example $$e --format inform7 --out out/examples/$$e.ni        -q; \
	  bin/story.js --example $$e --format choicescript --out out/examples/$$e.cs   -q; \
	  bin/story.js --example $$e --format dot     --out out/examples/$$e.dot       -q; \
	  echo "built out/examples/$$e.*"; \
	done

# PDFs of every example map (requires graphviz).
example-pdfs: examples
	@mkdir -p out/examples
	@for e in $(EXAMPLES); do \
	  dot -Tpdf out/examples/$$e.dot -o out/examples/$$e.pdf; \
	done

# The documentation site: markdown -> HTML, plus the playable stories.
site: docs-html play-site

docs-html:
	node bin/build-docs.js

play-site:
	node bin/build-play.js

# Same, but generate real prose for each example's canonical seed via the
# Anthropic API. Cached on disk by prompt hash, so re-runs are free.
play-site-prose:
	PROSE=1 node bin/build-play.js

# jsdoc + JSON-schema reference (needs jsdoc and generate-schema-doc on PATH).
docs-api:
	$(MAKE) -C docs all

clean-site:
	rm -f docs/*.html docs/spec/*.html
	rm -rf docs/papers docs/play/stories docs/play/game.js docs/play/phrasebook.js

.PHONY: examples example-pdfs site docs-html play-site play-site-prose docs-api clean-site
