#!/usr/bin/env node
import { run } from './cli';

run().catch(err => {
    console.error('Fatal error running CLI:', err);
    process.exit(1);
});
