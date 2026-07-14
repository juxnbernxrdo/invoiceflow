#!/usr/bin/env node
// Monkeypatch prompts figures pointer globally before loading other CLI modules
try {
    const figuresLib = require('prompts/lib/util/figures');
    if (figuresLib) figuresLib.pointer = '>';
} catch (e) {}
try {
    const figuresDist = require('prompts/dist/util/figures');
    if (figuresDist) figuresDist.pointer = '>';
} catch (e) {}

try {
    const styleLib = require('prompts/lib/util/style');
    if (styleLib) {
        styleLib.symbol = () => '';
        styleLib.delimiter = () => '';
    }
} catch (e) {}
try {
    const styleDist = require('prompts/dist/util/style');
    if (styleDist) {
        styleDist.symbol = () => '';
        styleDist.delimiter = () => '';
    }
} catch (e) {}

import { run } from './cli/index';

run().catch(err => {
    console.error('Fatal error running CLI:', err);
    process.exit(1);
});
