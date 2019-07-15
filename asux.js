#!/usr/bin/env node



//decison made: Each subfolder or org.ASUX (like this one org.ASUX.cmdline) will be a standalone project ..
// .. as in: this asux.js is EXPECTING to see cmdline-arguments **as if** it were entered by user on shell-prompt



//--------------------------
var fs = require("fs");     // https://nodejs.org/api/fs.html#fs_fs_accesssync_path_mode 

var ORGASUXHOME = process.env.ORGASUXHOME ? process.env.ORGASUXHOME : "/invalid/path/to/parentProject/org.ASUX";
// file-included - Not a 'require'
eval( fs.readFileSync( ORGASUXHOME+'/bin/asux-common.js' ) + '' );

//==========================================================
var CMDGRP="yaml";  // this entire file is about this CMDGRP.   !!! This value is needed within processYamlCmd()/processJavaCmd() - that function is defined within ${ORGASUXFLDR}/bin/asux-common.js
var COMMAND = "unknown"; // will be set based on what the user enters on the commandline.

//==========================================================
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
	.version('1.0', '-v, --version')
	.usage('[options] <commands ...>')
	.option('--verbose', 'A value that can be increased by repeating', 0)
	.option('--offline', 'whether to assume No internet and use cached responses (previously saved)', 0)
.command('read ...', 'read/query/ content from YAML files', { isDefault: false, noHelp: true } )
.command('list ...', 'list RHS-content from YAML files', { isDefault: false, noHelp: true } )
.command('delete ...', 'delete content from YAML files', { isDefault: false, noHelp: true } )
.command('replace ...', 'replace content from YAML files', { isDefault: false, noHelp: true } )
.command('macro ...', 'macro process YAML file based on propertiesFile', { isDefault: false, noHelp: true } )
.command('table ...', 'extract a tabular output from an input-YAML file', { isDefault: false, noHelp: true } )
.command('batch ...', 'run multiple commands in sequence, with output of one feeding into the next', { isDefault: false, noHelp: true } )
	;

//==========================
// Custom HELP output .. must be before .parse() since node's emit() is immediate

CmdLine.on('--help', function(){
  console.log('')
  console.log('Examples:');
  console.log('  $ %s --help', __filename);
  console.log('  $ %s --version', __filename);
  console.log('  $ %s --verbose read .. ..', __filename);
  console.log('  $ %s --no-verbose delete .. ..', __filename);
});

//==========================
/* execute custom actions by listening to command and option events.
 */

CmdLine.on('option:verbose', function () {
	console.log("Yeah.  Going verbose" + this.verbose);
  process.env.VERBOSE = this.verbose;
});

CmdLine.on('option:offline', function () {
	if (process.env.VERBOSE) console.log("Yeah.  Going _OFFLINE_ " );
	process.env.OFFLINE = true;
});

CmdLine.on('command:read', function () {
  COMMAND="read";
  processYamlCmd(COMMAND);
});

CmdLine.on('command:list', function () {
  COMMAND="list";
  processYamlCmd(COMMAND);
});

CmdLine.on('command:table', function () {
  COMMAND="table";
  processYamlCmd(COMMAND);
});

CmdLine.on('command:delete', function () {
  COMMAND="delete";
  processYamlCmd(COMMAND);
});

CmdLine.on('command:insert', function () {
  COMMAND="insert";
  processYamlCmd(COMMAND);
});

CmdLine.on('command:macroyaml', function () {
  COMMAND="macroyaml";
  processYamlCmd(COMMAND);
});

CmdLine.on('command:batch', function () {
  COMMAND="batch";
	// console.error( __filename +':\nProcessing ARGS command-line: ', CmdLine.args.join(' ') );
	// console.error( 'Processing FULL command-line: ', process.argv.join(' ') );
  processYamlCmd(COMMAND);
});

CmdLine.on('command:replace', function () {
  COMMAND="replace";
  processYamlCmd(COMMAND);
});

// Like the 'default' in a switch statement.. .. After all of the above "on" callbacks **FAIL** to trigger, we'll end up here.
// If we end up here, then .. Show error about unknown command
CmdLine.on('command:*', function () {
  console.error( __filename +':\nInvalid command: %s\nSee --help for a list of available commands.', CmdLine.args.join(' '));
	console.error( 'FULL command-line: ', process.argv.join(' ') );
  process.exit(21);
});

//==========================
CmdLine.parse(process.argv);

//============================================================
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//============================================================

function processYamlCmd( _CMD) {

    // !!!!!!!!!!!!!!!! ATTENTION !!!!!!!!!!!!!!!!!
    // yaml batch is the _TOPMOST_ useful capability of the org.ASUX project, as of 2019.
    // So, the ability to invoke code in org.ASUX.AWS.CFN and org.ASUX.AWS-SDK .. within a yaml-batch file .. is NOT-Negotiably important (no arguments: It is a must have capability).
    // So.. by implications, we need to set process.env.AWSHOME and process.env.AWSCFNHOME in here!!
    // !!!!!!!!!!!!!!!! ATTENTION !!!!!!!!!!!!!!!!!

    // whether or not process.env.AWSHOME is already set already.. reset it based on the location of this file (./asux.js)
    const afolder=ORGASUXHOME +"/AWS";
    if ( EXECUTESHELLCMD.checkIfExists( afolder ) ) {
      if ( checkIfExists( process.env.AWSHOME ) ) {
        console.error( __filename +" "+ afolder + " does Not exist.  Please set the environment variable 'AWSHOME'" );
        process.exitCode = 9;
        return;
      } else {
        // fall thru below.   process.env.AWSHOME is valid.
      }
    } else {
      if ( (afolder != process.env.AWSHOME) && EXECUTESHELLCMD.checkIfExists( process.env.AWSHOME ) ) {
        console.error( __filename +" The default "+ afolder + " conflicts with "+ process.env.AWSHOME +".  Please unset the environment variable AWSHOME or remove the folder "+ afolder );
        process.exitCode = 9;
        return;
      }
      process.env.AWSHOME = afolder;
    }

    // whether or not process.env.AWSCFNHOME is already set already.. reset it based on the location of this file (./asux.js)
    const afolder2=process.env.AWSHOME +"/CFN";
    if ( EXECUTESHELLCMD.checkIfExists( afolder2 ) ) {
      if ( checkIfExists( process.env.AWSCFNHOME ) ) {
        console.error( __filename +" "+ afolder2 + " does Not exist.  Please set the environment variable 'AWSCFNHOME'" );
        process.exitCode = 9;
        return;
      } else {
        // fall thru below.   process.env.AWSCFNHOME is valid.
      }
    } else {
      if ( (afolder2 != process.env.AWSCFNHOME) && EXECUTESHELLCMD.checkIfExists( process.env.AWSCFNHOME ) ) {
        console.error( __filename +" The default "+ afolder2 + " conflicts with "+ process.env.AWSCFNHOME +".  Please unset the environment variable AWSCFNHOME or remove the folder "+ afolder2 );
        process.exitCode = 9;
        return;
      }
      process.env.AWSCFNHOME = afolder2;
    }

    //-------------------
    if (process.env.VERBOSE) console.log( "Environment variables: AWSHOME=" + process.env.AWSHOME +", AWSCFNHOME=" + process.env.AWSCFNHOME +"\n" );

    //-------------------
    // !!!!!!!!!!!!!!!! ATTENTION !!!!!!!!!!!!!  The work gets done within the following call!!
    processJavaCmd( _CMD );

} // end function processCFNCmd

//============================================================
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//============================================================

// The Node.js process will exit on its own if there is no additional work pending in the event loop.
// The process.exitCode property can be set to tell the process which exit code to use when the process exits gracefully.
process.exitCode = 0;

//EoScript