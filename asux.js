#!/usr/bin/env node



//decison made: Each subfolder or org.ASUX (like this one org.ASUX.cmdline) will be a standalone project ..
// .. as in: this asux.js is EXPECTING to see cmdline-arguments **as if** it were entered by user on shell-prompt



var CmdLine = require('commander');
var os = require('os');
var PATH = require('path'); // to help process the script-file details.
var fs = require("fs");

// This is the Node.JS script within the same directory - to make it simple to run an external command
var EXECUTESHELLCMD = require( __dirname + "/../ExecShellCommand.js");

//==========================
CmdLine
	.version('1.0', '-v, --version')
	.usage('[options] <commands ...>')
	.option('--verbose', 'A value that can be increased by repeating', 0)
	;

///==========================
/* attach options to a command */
/* if a command does NOT define an action (see .action invocation), then the options are NOT validated */
/* For Git-like submodule commands.. ..
 *	When .command() is invoked with a description argument, no .action(callback) should be called to handle sub-commands.
 *	Otherwise there will be an error.
 *	By avoiding .action(), you tell commander that you're going to use separate executables for sub-commands, much like git(1) and other popular tools.
 *	The commander will try to search the executables in the directory of the entry script (if this file is TopCmd.js) for names like:- TopCmd-install.js TopCmd-search.js
 *	Specifying true for opts.noHelp (see noHelp)  will remove the subcommand from the generated help output.
*/

CmdLine
.command('read ...', 'read/query/ content from YAML files', { isDefault: false, noHelp: true } )
.command('list ...', 'list RHS-content from YAML files', { isDefault: false, noHelp: true } )
.command('delete ...', 'delete content from YAML files', { isDefault: false, noHelp: true } )
.command('replace ...', 'replace content from YAML files', { isDefault: false, noHelp: true } )
	;

//==========================
// Custom HELP output .. must be before .parse() since node's emit() is immediate

CmdLine.on('--help', function(){
  console.log('')
  console.log('Examples:');
  console.log('  $ %s --help', __filename);
  console.log('  $ %s --version', __filename);
  console.log('  $ %s --verbose yaml .. ..', __filename);
  console.log('  $ %s --no-verbose aws cfn .. ..', __filename);
});

//==========================
/* execute custom actions by listening to command and option events.
 */

CmdLine.on('option:verbose', function () {
	// console.log("Yeah.  Going verbose" + this.verbose);
  process.env.VERBOSE = this.verbose;
});

/// Like the 'default' in a switch statement.. .. After all of the above "on" callbacks **FAIL** to trigger, we'll end up here.
// If we end up here, then .. Show error about unknown command
CmdLine.on('command:*', function () {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', CmdLine.args.join(' '));
  process.exit(1);
});

//==========================
CmdLine.parse(process.argv);

//==========================


// The Node.js process will exit on its own if there is no additional work pending in the event loop.
// The process.exitCode property can be set to tell the process which exit code to use when the process exits gracefully.
process.exitCode = 0;

//EoScript