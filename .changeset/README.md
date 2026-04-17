# Changesets

`haplib` uses [changesets](https://github.com/changesets/changesets) to manage releases.

## Adding a change

Run `bun changeset` and follow the prompts. Commit the generated Markdown file alongside your code change.

## Cutting a release

The `release.yml` workflow automatically creates a "Version Packages" PR whenever there are pending changesets on `main`. Merging that PR triggers an `npm publish` with provenance.
