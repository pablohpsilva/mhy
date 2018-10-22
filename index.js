#!/usr/bin/env node

import { argv } from 'yargs'

function getLoadEco() {
    const load = require('@mhy/config').load
    const eco = load('ecosystem')
    return {
        load,
        eco
    }
}

function processExit(exitSignal, message) {
    console.error(message)
    process.exit(exitSignal)
}

function bootTask(technology, template, output) {
    const boot = require('@mhy/boot')
    boot(technology, template, output)
}

function configTask(config, format) {
    const load = require('@mhy/config').load
    if (!config) {
        return processExit(2, 'No config specified!')
    }
    let result = JSON.stringify(load(config), null, 2)
    if (format === 'js') {
        result = `module.exports = module.exports.default = ${result}`
    }
    process.stdout.write(result)
    process.exit(0)
}

function uiTask() {
    const { load, eco } = getLoadEco()
    process.MHY_ENV = 'ui'
    if (!Object.keys(eco).length) {
        return processExit(2, 'No UI Widgets are specified in the Ecosystem.')
    }
    const { disabled = [] } = load('ui');
    // Run processes
    const processes = Object.entries(eco)
        .filter(([key]) => !disabled.includes(key))
        .sort(([, { order: ao = 0 }], [, { order: bo = 0 }]) => ao - bo) // static order
        .reduce((o, [name, Process]) => {
            o[name] = new Process()
            return o
        }, {})
    // Init magic
    const render = require('./ui').default
    render(processes)
}

function runTask(cmdArguments) {
    const { eco } = getLoadEco()
    if (task !== 'run' && !(task in eco)) {
        return processExit(2, `No such task: ${task}`)
    }
    process.MHY_ENV = 'cli'
    let proc, args
    if (task === 'run') {
        [, proc, ...args] = cmdArguments
    }
    else {
        [proc, ...args] = cmdArguments
    }
    
    const Process = eco[proc]
    if (!Process) {
        return processExit(2, `No such process: ${proc}`)
    }

    (new Process(...args)).on('data', l => console.log(l))
}

function init(argv, [task, ...cmdArgumentsArray]) {
    switch (task) {
        case 'boot': {
            return bootTask(cmdArgumentsArray[0], cmdArgumentsArray[1], argv.o || argv.output)
        }
        case 'config': {
            return configTask(cmdArgumentsArray[0], argv.f || argv.format || 'js')
        }
        case 'ui':
        case undefined: {
            return uiTask()
        }
        case 'run':
        default: {// mhy webpack
            return runTask(cmdArgumentsArray)
        }
    }
}

init(argv, argv._)