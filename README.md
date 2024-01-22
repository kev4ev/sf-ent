> _It is a lovely language, but it takes a very long time to say anything in it, because we do not say anything in it, unless it is worth taking a long time to say, and to listen to._

# Intro 

The Salesforce Composite API is an invaluable tool for loading complex data across orgs and at volume. But, much like Old Entish 🌳, its endpoints require a dialect that is verbose and time-consuming to construct. Let's make things a bit more "hasty".

`sf-entish` provides a declarative API for building composite payloads quickly and intuitively. Use it interactively from the command line or as a library in a script. This library adds some helpful tricks and shortcuts such as **randomization** and **variable placeholders** to get you up-and-running quickly.

# Installation
> npm install [--global] sf-entish

**This library also drives the sf CLI (@salesforce/cli) plugin `sf-plugin-composite`, which you can install as such**:
> sf plugins install sf-plugin-composite

# Usage

## Command Line

## API

```js
const ent = require('sf-entish');
```