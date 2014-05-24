
test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--harmony

.PHONY: test