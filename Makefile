install:
	pnpm install

build:
	pnpm run build

login:
	npm login

publish:
	npm publish --access public

unpublish:
	npm unpublish @bemi-io/drizzle@$$VERSION --force
