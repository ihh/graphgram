
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


# README
README.md: bin/transform.js
	bin/transform.js -h | perl -pe 's/</&lt;/g;s/>/&gt;/g;' | perl -e 'open FILE,"<README.md";while(<FILE>){last if/<pre>/;print}close FILE;print"<pre><code>\n";while(<>){print};print"</code></pre>\n"' >temp.md
	mv temp.md $@
