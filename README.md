
⛔ _This is a beta version that is not suitable for production use_. 

# Intro 

<!--
> _It is a lovely language, but it takes a very long time to say anything in it, because we do not say anything in it, unless it is worth taking a long time to say, and to listen to._ -->

The [Salesforce Composite API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_composite.htm) is an invaluable tool for loading complex data sets across orgs. It is also, unfortunately, verbose and time-consuming to implement.

`sf-ent` makes harnessing the Composite API fast and intuitive. Use it **interactively from the command line** or programmatically as a **script library**. Build requests and load data quickly.

# Installation

```sh
npm install [--global] sf-ent
```

# Usage

The CLI and script APIs are very similar. Commands and subcommands for each use the same names. 

The primary difference is that the CLI will prompt you for required inputs and provides **object and field auto-completion based on the schema of an authenticated org**. Some CLI commands also support flags. Pass `-h` or `--help` with any command to learn more.


## `generate`

The following shows an example of using the `generate` command to create a composite API request file with a single `query` subrequest:

**CLI**:

```sh
$ sfent generate --out ./query.json 
$ # prompts will guide you to create the query
```

**Script**:

```js
const { ent } = require('sf-ent');

// all commands are chainable and must be terminated by invocation of done(), returning a Promise that resolves to the command output
await ent()
    .generate({ out: './query.json' })
        .query('select id from recordType where sobjectType = \'Account\' and developerName = \'consumer\'')
    .done();
```

# API

_Full documentation coming soon._

# Notes

## TypeInfo in URL Hash <span id="urlTypeInfo"></span>

`sf-ent` appends the name of the class that constructs each Composite subrequest as a URL hash, a la:

```json
{
    // ...
    "url": "/services/data/v60.0/query/?q=SELECT id FROM Account limit 1#Query_github.com/kev4ev/sf-ent#urlTypeInfo"
    // ...
}
```

It does this so that the prototype can be inferred when a request is loaded into the CLI for interactive modification. Since hashes are not read by the server **it has no effect on the request** to Salesforce. 

Happy Building!

<!-- highlights:
 - async generator functions => for prompts
 - Promise extension => to allow synchronous API chaining in lib
 - Streams => generate preview
 - events => this is JS, after all
 - fun with Symbols => because why not
 -->