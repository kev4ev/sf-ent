> _It is a lovely language, but it takes a very long time to say anything in it, because we do not say anything in it, unless it is worth taking a long time to say, and to listen to._

# Intro 

The Salesforce Composite API is an invaluable tool for loading complex data across orgs and at volume. But, much like Old Entish 🌳, its endpoints require a dialect that is verbose and time-consuming to construct. Let's make things a bit more "hasty".

`sf-entish` provides a declarative API for building composite payloads quickly and intuitively. Use it interactively from the command line or as a library in a script. This library adds some helpful tricks and shortcuts such as **randomization** and **variable placeholders** to get you up-and-running quickly.

# Installation

```sh
npm install [--global] sf-entish
```

This library also drives the Salesforce CLI (sf) plugin `sf-plugin-composite`. If you wish to install only as a plugin to the sf command line you can do so as such:

```sh
sf plugins install sf-plugin-composite
```

# Usage

Usage from the command line and through a script are very similar. Commands and subcommands for each have the same names. The primary difference is that when used as a library, all arguments must be provided to each command upon invocation. From the command-line, the user will be prompted for all responses, though top-level commands may support flags. 

The following shows an example of using the `generate` command to create a composite API request file with a single `query` subrequest:

Within a **script**...

```js
const Ent = require('sf-entish');

// constructor accepts an authorized jsforce Connection instance; 
// otherwise, either of (1) $SFUNAME and $SFPWD or (2) $SFSID are required to be present as shell variables
const ent = new Ent();
// all ent methods are chainable and return a Promise that resolves to an instance of RequestBuilder or Ent
await ent 
    .generate({ out: './query.json' })
        .query('select id from recordType where sobjectType = \'Account\' and developerName = \'consumer\'')
        .endCommand()
    .finish();
```

From the **command line**...

```sh
$ sfent generate --out ./query.json 
$ # user will be prompted to provide query and create the request file
```

# API

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

It does this so that the prototype can be inferred when a request is loaded into the CLI for interactive modificiation. Since hashes are not read by the server **it has no effect on the request** to Salesforce. 


<!-- highlights:
 - async generator functions => for prompts
 - Promise extension => to allow synchronous API chaining in lib
 - Streams => generate preview
 - events => this is JS, after all
 - fun with Symbols => because why not
 -->