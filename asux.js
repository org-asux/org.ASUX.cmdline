#!/usr/bin/env node



//decison made: Each subfolder or org.ASUX (like this one org.ASUX.cmdline) will be a standalone project ..
// .. as in: this asux.js is EXPECTING to see cmdline-arguments **as if** it were entered by user on shell-prompt



var CmdLine = require('commander'); // https://github.com/tj/commander.js/
var os = require('os');     // https://nodejs.org/api/os.html
var PATH = require('path'); // to help process the script-file details.
var fs = require("fs");     // https://nodejs.org/api/fs.html#fs_fs_accesssync_path_mode 

// This is the Node.JS script within the same directory - to make it simple to run an external command
var EXECUTESHELLCMD = require( __dirname + "/../ExecShellCommand.js");
var WEBACTIONCMD = require( __dirname + "/../WebActionCmd.js" );

var CMDGRP="yaml"; // this entire file is about this CMDGRP
var CMD="none";
var CLASSPATH='';

//==========================
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
  CMD="read";
  processYAMLCmd('read');
});

CmdLine.on('command:list', function () {
  CMD="list";
  processYAMLCmd('list');
});

CmdLine.on('command:replace', function () {
  CMD="replace";
  processYAMLCmd('replace');
});

CmdLine.on('command:delete', function () {
  CMD="delete";
  processYAMLCmd('delete');
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

  var bIsMavenInstalled; // When you declare a variable by having a var in a block-statement, but haven't yet assigned a value to it, it is undefined.
  var bAnyChanges2JARs = false;
  const DependenciesFile=__dirname + "/etc/classpaths/"+ CMDGRP +"-cmd.dependencies";
  // fs.access( DependenciesFile, function(err11) {.. .. ..} );
  if (process.env.VERBOSE)console.log( `checking if ${DependenciesFile} exists or not.. .. ` );

  // fs.readFile( DependenciesFile,  "utf-8",  (err13, data) => {}
  try {
      const dataBuffer = fs.readFileSync( DependenciesFile ); //  {encoding: "utf-8", flag: "r"}
      const data = dataBuffer.toString();
      if (process.env.VERBOSE) console.log( __filename +" file contents of DependenciesFile: ["+ DependenciesFile +"]\n"+ data +"\n");

      // now .. check if Maven exists & set bIsMavenInstalled to either true or false (it is initiatlized above to undefined)
      if ( bIsMavenInstalled == undefined ) {
        const retCode = EXECUTESHELLCMD.executionPiped ( __dirname, 'mvn', ['--version'], true, process.env.VERBOSE, false, null);
        if ( retCode != 0 ) {
          // if (process.env.VERBOSE) 
          console.log("Unable to run MAVEN ('mvn' command)");
          bIsMavenInstalled = false;
        }else{
          bIsMavenInstalled = true;
        }
      }

      const lines = data.split('\n');
      for (var ix in lines) {
        const line = lines[ix];
        if (process.env.VERBOSE) console.log( __filename +" file contents of DependenciesFile: line #"+ ix +" = ["+ line +"]");
        if ( line.match('^#') ) continue;
        if ( line.match('^[\s\S]*$') ) continue;
        if (process.env.VERBOSE) console.log( __filename +" file contents of DependenciesFile: line #"+ ix +" = ["+ line +"]");

        // ______________________
        // function replStrFunc (match, p1, p2, p3, offset, string) { return match; }
        // outStr1WPrefix = outStr1WPrefix.replace(/^[^\n][^\n]*\n/mg, replStrFunc);
        const MAVENLOCALREPO=os.homedir()+'/.m2/repository';
        const REGEXP='^(.*):(.*):jar:([0-9]*\.[0-9.]*)';  // https://flaviocopes.com/javascript-regular-expressions/
        let [ lineReturnedAsIs, groupId, artifactId, version ] = line.match(REGEXP);
        // const groupId = line.replace( REGEXP, "$1");
        // const artifactId = line.replace( REGEXP, "$2");
        // const version = line.replace( REGEXP, "$3");

        const folderpath=groupId.replace( new RegExp('\\.', 'g'), '/');
        const MVNfolderpath=MAVENLOCALREPO +'/'+ folderpath +'/'+ artifactId +'/'+ version;
        const JARFileName = artifactId +'-'+ version +".jar";
        const MVNJARFilePath=MVNfolderpath +'/'+ JARFileName;
        const LocalJARFilePath=`/tmp/dist/${JARFileName}`;
        const S3FileName=`${groupId}.${artifactId}.${artifactId}-${version}.jar`;
        const URL1 = `https://s3.amazonaws.com/org.asux.cmdline/${S3FileName}`;

        if (process.env.VERBOSE) console.log( __filename +": ["+ groupId +'.'+ artifactId +':'+ version +"]");
        if (process.env.VERBOSE) console.log( __filename +": ["+ folderpath +'\t\t'+ MVNfolderpath +'\t\t'+ MVNJARFilePath +"]");

        // ______________________
        if ( bIsMavenInstalled ) {

          var bJARFileExists = false;

          // Let's see if the project's JAR File is already in ~/.m2/repository
          try {
            // if (process.env.VERBOSE) ÷console.log( `checking if ${MVNJARFilePath} exists or not.. .. ` );
            fs.accessSync( MVNJARFilePath ); // will throw.
            // Ok. JAR file already exists ~/.m2
            if (process.env.VERBOSE) EXECUTESHELLCMD.showFileAttributes ( MVNJARFilePath );  // ls -la "${MVNJARFilePath}"
            CLASSPATH=`${CLASSPATH}:${MVNJARFilePath}`;
            if (process.env.VERBOSE) console.log( __filename +": CLASSPATH = ["+ CLASSPATH +"]");
            bJARFileExists = true;
          } catch (err12) { // a.k.a. if fs.accessSync throws err12.code === 'ENOENT')

            try {
              if (process.env.VERBOSE) console.log( `checking if ${LocalJARFilePath} already downloaded or not.. .. ` );
              fs.accessSync( LocalJARFilePath ); // will throw.
              // Ok. JAR file already exists in local file system
              if (process.env.VERBOSE) EXECUTESHELLCMD.showFileAttributes ( LocalJARFilePath );  // ls -la "${LocalJARFilePath}"
              CLASSPATH=`${CLASSPATH}:${LocalJARFilePath}`;
              if (process.env.VERBOSE) console.log( __filename +": after adding LocalJARFile.. .. CLASSPATH = ["+ CLASSPATH +"]");
              bJARFileExists = true;
            } catch (err15) { // a.k.a. if fs.accessSync throws err15.code === 'ENOENT')
              // if we're here, JAR is NEITHER in ~/.m2/repository - NOR in /tmpdist
            } // try-catch err15 for accessSync( LocalJARFilePath )

          } // try-catch err12 for accessSync( MVNJARFilePath )

          if (  ! bJARFileExists ) {

            // So.. MVNJARFilePath does Not exist already in LOCAL m2 repository
            bAnyChanges2JARs = true; // well, something will be new once code below executes!
            console.error( `Hmmm. ${MVNJARFilePath} does Not exist locally.` );
            const cmdArgs = ['-q', 'org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get', '-DrepoUrl=url', `-Dartifact=${groupId}:${artifactId}:${version}` ];
            if (process.env.VERBOSE) console.log( __filename + ": About to run mvn "+ cmdArgs.join(' ') );

            const retCode = EXECUTESHELLCMD.executionPiped ( "/tmp", 'mvn', cmdArgs, true, process.env.VERBOSE, false, null);
            if ( retCode == 0 ) {
              CLASSPATH=`${CLASSPATH}:${MVNJARFilePath}`;
              console.log( __filename +": CLASSPATH = ["+ CLASSPATH +"]");
            }else{
              console.error( `MAVEN could NOT download project ${groupId}.${artifactId}:${version} from MAVEN-CENTRAL`);
              console.error( "So.. Downloading from S3.  *** Not a secure way to do things ***"  );
              EXECUTESHELLCMD.sleep(5);

                // try {
                //   if (process.env.VERBOSE) console.log( `checking if ${LocalJARFilePath} already downloaded or not.. .. ` );
                //   fs.accessSync( LocalJARFilePath ); // will throw.
                //   // Ok. JAR file already exists in local file system
                //   if (process.env.VERBOSE) EXECUTESHELLCMD.showFileAttributes ( LocalJARFilePath );  // ls -la "${LocalJARFilePath}"
                //   CLASSPATH=`${CLASSPATH}:${LocalJARFilePath}`;
                //   if (process.env.VERBOSE) console.log( __filename +": after adding LocalJARFile.. .. CLASSPATH = ["+ CLASSPATH +"]");
                // } catch (err15) { // a.k.a. if fs.accessSync throws err15.code === 'ENOENT')
                // }

                // if we're here, JAR is NEITHER in ~/.m2/repository - NOR in /tmpdist

                // If the URL does NOT point to an ACTUAL file in S3, /usr/bin/curl will still get a RESPONSE from S3.
                // So that we can tell whether a file was downloaded or not.. use "curl -f"
                // var [ bSuccess, httpStatusCode, httpmsg ] = WEBACTIONCMD.getURLAsFileSynchronous( URL1, LocalJARFilePath); 
                var [ httpStatusCode, errMsg ] = WEBACTIONCMD.getURLAsFileSynchronous( URL1, LocalJARFilePath); 

                if ( httpStatusCode != 200 ) {
                  console.error( __filename + ": Serious internal failure: Failure to download from ["+ URL1 +"] httoCode="+ httpStatusCode +"]");
                  console.error( __filename + ": httpMessage = ["+ errMsg +"]");
                  process.exit(27);
                } else { // if-else httpStatusCode returned 200
                  // Either the above get URL command returned a NON-zero error code, or an empty file
                  const fstats = fs.statSync(LocalJARFilePath);
                  if ( fstats.size <= 0 ) { // file is zero bytes!!!
                    console.error( __filename + ": Serious internal failure: zero-byte download ["+ LocalJARFilePath +"] from: "+ URL1 );
                    process.exit(28);
                  }
                  // all ok with LocalJARFilePath
                  const cmdArgs = ['-q', `install:install-file -Dfile=${LocalJARFilePath}`, `-DgroupId=${groupId}`, `-DartifactId=${artifactId}`, `-Dversion=${version}`, '-Dpackaging=jar', '-DgeneratePom=true' ];
                  // if (process.env.VERBOSE) 
                  console.log( `${__filename} : in /tmp running 'mvn' with cmdline-arguments:` + cmdArgs.join(' ') );
                  const retCode = EXECUTESHELLCMD.executionPiped ( "/tmp", 'mvn', cmdArgs, true, process.env.VERBOSE, false, null);
                  if ( retCode == 0 ) {
                    CLASSPATH=`${CLASSPATH}:${MVNJARFilePath}`;
                    console.log( __filename +": mvn-install succeeded, so using CLASSPATH = ["+ CLASSPATH +"]");
                  }else{
                    CLASSPATH=`${CLASSPATH}:${LocalJARFilePath}`;
                    console.log( __filename +": MVN install FAILED!!!!!!  So.. using LocalJARFile CLASSPATH = ["+ CLASSPATH +"]");
                    // console.error( __filename +`Internal Fatal error. Unable to install ${MVNJARFilePath} to ${MAVENLOCALREPO}.` );
                    // process.exit(28);
                  }

                } // if-else httpStatusCode

            } // if-else retCode
          } // if ! bJARFileExists

        } else { // if bIsMavenInstalled

          // ______________________
          // Let's see if the project is already in LOCAL-filesystem inside /tmp/dist folder
          try {
            if (process.env.VERBOSE) console.log( `checking if ${LocalJARFilePath} exists or not.. .. ` );
            fs.accessSync( LocalJARFilePath ); // will throw.
            // Ok. JAR file already exists locally on file-system
            EXECUTESHELLCMD.showFileAttributes ( LocalJARFilePath );
            CLASSPATH=`${CLASSPATH}:${MVNJARFilePath}`;
            if (process.env.VERBOSE) console.log( __filename +": CLASSPATH = ["+ CLASSPATH +"]");
          } catch (err14) { // a.k.a. if  err14.code === 'ENOENT')

            // So.. LocalJARFilePath does *** NOT *** exist in local file system
            bAnyChanges2JARs = true; // well, something will be new once code below executes!
            console.error( `Hmmm. ${LocalJARFilePath} does Not exist.\n${err14.message}\n` );
            console.error( "Without Maven.. Downloading from S3.  *** Not a secure way to do things ***"  );
            // var [ bSuccess, httpStatusCode, httpmsg ] = WEBACTIONCMD.getURLAsFileSynchronous( URL1, LocalJARFilePath); 
            var [ httpStatusCode, errMsg ] = WEBACTIONCMD.getURLAsFileSynchronous( URL1, LocalJARFilePath); 
            if ( httpStatusCode != 200 ) {
              console.error( __filename + ": Serious internal failure: Failure to download from ["+ URL1 +"] httoCode="+ httpStatusCode +"]");
              console.error( __filename + ": httpMessage = ["+ errMsg +"]");
              process.exit(29);
            } else { // if-else httpStatusCode returned 200
                // Either the above get URL command returned a NON-zero error code, or an empty file
                const fstats = fs.statSync(LocalJARFilePath);
                if ( fstats.size <= 0 ) { // file is zero bytes!!!
                  console.error( __filename + ": Serious internal failure: zero-byte download ["+ LocalJARFilePath +"] from: "+ URL1 );
                  process.exit(28);
                }
                // all ok with LocalJARFilePath
                CLASSPATH=`${CLASSPATH}:${LocalJARFilePath}`;
                if (process.env.VERBOSE) console.log( __filename +": CLASSPATH = ["+ CLASSPATH +"]");
              } // if-else httpStatusCode

          } // try-catch err14 for accessSync( LocalJARFilePath )

        } // if-else bIsMavenInstalled

      } // for lineObj of iterator

    } catch (err13) { // a.k.a. if fs.readFileSync throws err13.code === 'ENOENT' || 'EISDIR')
      console.error( __filename +"Internal error: failed to read DependenciesFile: ["+ DependenciesFile +"]\n"+ err13);
      process.exit(23);
  }; // try-catch of fs.readFileSync ( DependenciesFile .. )

	//--------------------
  // if (process.env.VERBOSE)
  if (process.env.VERBOSE) console.log( __filename +": CLASSPATH = ["+ CLASSPATH +"]");
  // ${CMDCLASS} is defined inside this properties file
  const props = require ( `${__dirname}/etc/js-source/${CMDGRP}.js-source` )
  if ( bAnyChanges2JARs ) console.log('\n\n'); // well, "setup" output was observed by end-user.. so, put a couple of blank lines for readability.

	//--------------------
	// In Unix shell, If there are spaces inside the variables, then "$@" retains the spaces, while "$*" does not
	// The following lines of code are the JS-quivalent of shell's      ./cmdline/asux $@
  // Get rid of 'node' '--verbose'(optionally) and 'asux.js'.. .. and finally the 'yaml/asux' command


  // Example: I see:     /usr/local/Cellar/node/10.2.1/bin/node /private/tmp/org.ASUX/cmdline/asux.js read --yamlpath s* --inputfile /tmp/nano.yaml
  // NOTE: Since we are in the sub-module .. .. org.ASUX/asux.js will REMOVE the 'yaml' or 'aws' command - from the ARGV cmd line


  var cmdArgs = process.argv.slice( ( process.argv[0].match('.*node$') )? 2: 1 ); // get rid of BOTH 'node' and 'asux.js'
  if ( cmdArgs[2] == '--verbose' ) cmdArgs = cmdArgs.slice( 1 );
  // Now, JSON's Commander-library only allows 'read' as a command.
  // But, Java Apache commons-cli REQUIRES double-hyphened command '--read'
  cmdArgs[0] = '--' + cmdArgs[0]; // convert 'read' into '--read'
	cmdArgs.splice(0,0, '-cp' ); // insert ./asux.js as the 1st cmdline parameter
	cmdArgs.splice(1,0, CLASSPATH ); // insert CLASSPATH as the 2nd cmdline parameter
	cmdArgs.splice(2,0, props['CMDCLASS'] ); // insert CMDCLASS=org.ASUX.yaml.Cmd as the 3rd cmdline parameter
  if (process.env.VERBOSE) cmdArgs.splice( 3, 0, '--verbose' ); // optionally, insert '--verbose' as the 4th cmdline parameter (going to my Cmd.java)
  // if (process.env.VERBOSE) 
  if (process.env.VERBOSE) console.log( `${__filename} : within /tmp:\n\tjava ` + cmdArgs.join(' ') +"\n" );

  const retCode = EXECUTESHELLCMD.executeSharingSTDOUT ( "/tmp", 'java', cmdArgs, true, process.env.VERBOSE, false, null);
  if ( retCode == 0 ) {
    if (process.env.VERBOSE) console.log( "\n"+ __filename +": Done!");
    process.exitCode = 0;
  }else{
    console.error( __filename +": Failed with error-code "+ retCode +" for: "+ props['CMDCLASS'] +" "+ cmdArgs.join(' '));
    process.exit(retCode);
  }

} // end function processYAMLCmd

//============================================================
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//============================================================

// The Node.js process will exit on its own if there is no additional work pending in the event loop.
// The process.exitCode property can be set to tell the process which exit code to use when the process exits gracefully.
process.exitCode = 0;

//EoScript