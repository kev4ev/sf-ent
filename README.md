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

## Command Line

## API

```js
const Ent = require('sf-entish');

// constructor accepts an authorized jsforce Connection instance; 
// otherwise, either of (1) $SFUNAME and $SFPWD or (2) $SFSID are required to be present as shell variables
const ent = new Ent();
// all ent methods are chainable and return a Promise that resolves to an instance of RequestBuilder or Ent
await ent 
    .generate()
    .query('select id from recordType where sobjectType = \'Account\' and developerName = \'consumer\'')
    .sobject('Account').insert()
```