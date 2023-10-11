all: schema_doc.html jsdoc

clean:
	rm -rf schema_doc.* jsdoc/ grammar-schema.json

schema_doc.html: grammar-schema.json
	generate-schema-doc $<

grammar-schema.json:
	../bin/transform.js -j $@

jsdoc:
	jsdoc -c jsdoc-conf.json -u tutorials -d $@

