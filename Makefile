
grammars/%.json: grammars/%.js
	node -e 'console.log(JSON.stringify(eval('"'"'('"'"'+fs.readFileSync("$<").toString()+'"'"')'"'"'),null,2))' >$@

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
