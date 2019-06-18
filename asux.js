#!/usr/bin/env node



//decison made: Each subfolder or org.ASUX (like this one org.ASUX.cmdline) will be a standalone project ..
// .. as in: this asux.js is EXPECTING to see cmdline-arguments **as if** it were entered by user on shell-prompt



//--------------------------
var fs = require("fs");     // https://nodejs.org/api/fs.html#fs_fs_accesssync_path_mode 

var ORGASUXHOME = process.env.ORGASUXHOME ? process.env.ORGASUXHOME : "/invalid/path/to/parentProject/org.ASUX";
// file-included - Not a 'require'
eval( fs.readFileSync( ORGASUXHOME+'/asux-common.js' ) + '' );

//==========================================================
var CMDGRP="yaml"; // this entire file is about this CMDGRP
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
.command('read ...', 'read/query/ content from YAML files', { isDefault: false, noHelp: true } )
.command('list ...', 'list RHS-content from YAML files', { isDefault: false, noHelp: true } )
.command('delete ...', 'delete content from YAML files', { isDefault: false, noHelp: true } )
.command('replace ...', 'replace content from YAML files', { isDefault: false, noHelp: true } )
.command('macro ...', 'macro process YAML file based on propertiesFile', { isDefault: false, noHelp: true } )
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

CmdLine.on('command:read', function () {
  COMMAND="read";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:list', function () {
  COMMAND="list";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:table', function () {
  COMMAND="table";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:delete', function () {
  COMMAND="delete";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:insert', function () {
  COMMAND="insert";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:macro', function () {
  COMMAND="macro";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:batch', function () {
  COMMAND="batch";
  processYAMLCmd(COMMAND);
});

CmdLine.on('command:replace', function () {
  COMMAND="replace";
  processYAMLCmd(COMMAND);
});

// Like the 'default' in a switch statement.. .. After all of the above "on" callbacks **FAIL** to trigger, we'll end up here.
// If we end up here, then .. Show error about unknown command
CmdLine.on('command:*', function () {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', CmdLine.args.join(' '));
  process.exit(21);
});

//==========================
CmdLine.parse(process.argv);

//============================================================
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//============================================================

function processYAMLCmd( _CMD) {

  const bIsMavenInstalled = chkMavenInstalled();
  const DependenciesFile=__dirname + "/etc/classpaths/"+ CMDGRP +"-cmd.dependencies";
  const CLASSPATH = genDependencyCLASSPATH( DependenciesFile, bIsMavenInstalled );

  // ${CMDCLASS} is defined inside this properties file
  const props = require ( `${__dirname}/etc/js-source/${CMDGRP}.js-source` )

	//--------------------
	// pre-scripts (Before running ./cmdline/asux.js)
	EXECUTESHELLCMD.runPreScripts(); // ignore any exit code from these PRE-scripts

  //--------------------
  var cmdArgs = copyCmdLineArgs( _CMD, /* _bInsertDoubleHyphen */ true, /* _bAddCmd2Params */ true );
  // copyCmdLineArgs() is defined within ORGASUXHOME/asux-common.js

	cmdArgs.splice( 0, 0, '-cp' ); // insert ./asux.js as JAVA's 1st cmdline parameter
  cmdArgs.splice( 1, 0, CLASSPATH ); // insert CLASSPATH as JAVA's  2nd cmdline parameter
  cmdArgs.splice( 2, 0, "-DORGASUXHOME="+ORGASUXHOME );
	cmdArgs.splice( 3, 0, props['CMDCLASS'] ); // insert CMDCLASS=org.ASUX.yaml.Cmd as JAVA's  3rd cmdline parameter
  if (process.env.VERBOSE) console.log( `${__filename} : within /tmp:\n\tjava ` + cmdArgs.join(' ') +"\n" );

  const retCode = EXECUTESHELLCMD.executeSharingSTDOUT ( INITIAL_CWD, 'java', cmdArgs, true, process.env.VERBOSE, false, null );
  process.exitCode = retCode;

  if ( retCode == 0 ) {
    if (process.env.VERBOSE) console.log( "\n"+ __filename +": Done!");
    // process.exitCode = 0;
  }else{
    if (process.env.VERBOSE) console.error( '\n'+ __filename +": Failed with error-code "+ retCode +" for: java "+ cmdArgs.join(' '));
    // process.exit(retCode);
  }

	//--------------------
	EXECUTESHELLCMD.runPostScripts(); // ignore any exit code from these Post-scripts

} // end function processYAMLCmd

//============================================================
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//============================================================

// The Node.js process will exit on its own if there is no additional work pending in the event loop.
// The process.exitCode property can be set to tell the process which exit code to use when the process exits gracefully.
process.exitCode = 0;

//EoScript