
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
