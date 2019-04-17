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
  if (process.env.VERBOSE) console.log("Yeah.  processing YAML READ-command");
  var CMDGRP="read";
  readYAMLCmd();
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

function readYAMLCmd() {

  var bIsMavenInstalled; // When you declare a variable by having a var in a block-statement, but haven't yet assigned a value to it, it is undefined.
  const DependenciesFile=__dirname + "/etc/classpaths/"+ CMDGRP +"cmd.dependencies";
  // fs.access( DependenciesFile, function(err11) {.. .. ..} );
  if (process.env.VERBOSE) console.log( `checking if ${DependenciesFile} exists or not.. .. ` );

  fs.readFile( DependenciesFile,  "utf-8",  (err13, data) => {
    if (err13) {
      console.error("Internal error: failed to read DependenciesFile: ["+ DependenciesFile +"]\n"+ err13);
      process.exit(23);
    }else{
      if (process.env.VERBOSE) console.log(__filename +" file contents of DependenciesFile: ["+ DependenciesFile +"]\n"+ data +"\n");

      // now .. check if Maven exists & set bIsMavenInstalled to either true or false (it is initiatlized above to undefined)
      if ( bIsMavenInstalled == undefined ) {
        const retcode = EXECUTESHELLCMD.execution ( __dirname, 'mvn', ['--version'], true, process.env.VERBOSE, false, null);
        if ( retcode != 0 ) {
          if (process.env.VERBOSE) console.log("Unable to run MAVEN ('mvn' command)");
          bIsMavenInstalled = false;
        }else{
          bIsMavenInstalled = true;
        }
      }

      const lines = data.split('\n');
      var iterator = lines.entries();
      for (let lineObj of iterator) {
          if (process.env.VERBOSE) console.log(__filename +" file contents of DependenciesFile: line #"+ lineObj.key +" = ["+ lineObj.value +"]");
          const line = lineObj.value;
          if ( line.startsWith('##*') ) continue;

          // ______________________
          // function replStrFunc (match, p1, p2, p3, offset, string) { return match; }
          // outStr1WPrefix = outStr1WPrefix.replace(/^[^\n][^\n]*\n/mg, replStrFunc);
          const MAVENLOCALREPO=os.homedir()+'/.m2/repository';
          const REGEXP='^\(.*\):\(.*\):jar:\([0-9]*\.[0-9.]*\)$';
          const groupId = line.replace( REGEXP, "$1");
          const artifactId = line.replace( REGEXP, "$2");
          const version = line.replace( REGEXP, "$3");

          const folderpath=groupId.replace( "'\.'g", '/');
          const MVNfolderpath=MAVENLOCALREPO +'/'+ folderpath +'/'+ artifactId +'/'+ version;
          const JARFileName = artifactId +'-'+ version +".jar";
          const MVNJARFilePath=MVNfolderpath +'/'+ JARFileName;
          const LocalJARFilePath=`/tmp/dist/${JARFileName}`;

          console.error(__filename +": ["+ groupId +'.'+ artifactId +':'+ version +"]");
          console.error(__filename +": ["+ folderpath +'.'+ MVNfolderpath +':'+ MVNJARFilePath +"]");

          // ______________________
          if ( bIsMavenInstalled ) {
            // Let's see if the project is already in LOCAL m2 repository
            fs.access( MVNJARFilePath, function(err12) {
              if (process.env.VERBOSE) console.log( `checking if ${MVNJARFilePath} exists or not.. .. ` );
              if (err12) { // a.k.a. if ( err12 && err12.code === 'ENOENT')
                // So.. MVNJARFilePath does Not exist already in LOCAL m2 repository
                console.error( `Hmmm. ${MVNJARFilePath} does Not exist.\n${err12.message}` );
                console.log(__filename + `: About to run mvn -q org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get -DrepoUrl=url -Dartifact=${groupId}:${artifactId}:${version}`);
                const cmdArgs = ['-q', 'org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get', '-DrepoUrl=url',
                    `-Dartifact=${groupId}:${artifactId}:${version}` ];
                const retCode = EXECUTESHELLCMD.executeSharingSTDOUT ( "/tmp", 'mvn', cmdArgs, false, process.env.VERBOSE, false, null);
                if ( retcode == 0 ) {
                  CLASSPATH=`${CLASSPATH}:${MVNJARFilePath}`;
                }else{
                  console.log( "MAVEN could NOT download project from MAVEN-CENTRAL");
                  console.log( "So.. Downloading from S3.  *** Not a secure way to do things ***"  );
                  const S3FileName=`${groupId}.${artifactId}.${artifactId}-${version}.jar`;
                  const URL1 = `https://s3.amazonaws.com/org.asux.cmdline/${S3FILENAME}`;
                  // If the URL does NOT point to an ACTUAL file in S3, CURL will still get a RESPONSE from S3.
                  // So that we can tell whether a file was downloaded or not.. use curl -f
                  EXECUTESHELLCMD.getURLAsFile( URL1, LocalJARFilePath, ( bSuccess, httpcode, httpmsg ) => {
                    if (bSuccess) {
                      // Either the above get URL command returned a NON-zero error code, or an empty file
                      // How do I test if a file is of size zero-bytes?
                      // ?????????????? If ZERO BYTES THEN .. .. .. echo "Serious internal failure: Unable to install: " ${groupId}.${artifactId}-${ver}.jar
                    }else{
                      const cmdArgs = ['-q', `install:install-file -Dfile=${LocalJARFilePath}`, `-DgroupId=${groupId}`, `-DartifactId=${artifactId}`, `-Dversion=${ver}`, '-Dpackaging=jar', '-DgeneratePom=true' ];
                      const retCode = EXECUTESHELLCMD.execution ( "/tmp", 'mvn', cmdArgs, true, process.env.VERBOSE, false, null);
                      if ( retcode == 0 ) {
                        CLASSPATH=`${CLASSPATH}:${MVNJARFilePath}`;
                      }else{
                        // CLASSPATH=`${CLASSPATH}:${LocalJARFilePath}`;
                        console.error( `Internal Fatal error. Unable to install ${MVNJARFilePath} to ${MAVENLOCALREPO}.\n${err12}\n` );
                        process.exit(28);
                      }
                    } // if-else bSuccess
                  } ); // getURLAsFile(.. )
                } // if-else retCode != 0
              }else{ // if-else err12
                // Ok. JAR file already exists ~/.m2
                // ls -la "${MVNJARFilePath}"
                // EXECUTESHELLCMD.executeSharingSTDOUT ( "/tmp", 'ls', [MVNJARFilePath], false, process.env.VERBOSE, false, null );
                const fstats = fs.statSync(MVNJARFilePath);
                var mtime = new Date(util.inspect(fstats.mtime));
                console.log(MVNJARFilePath +' '+ fstats.size +' '+ mtime );
              } // if-else err12
            }); // fs.access (MVNJARFilePath ..)

          } else { // if bIsMavenInstalled

            // ______________________
            // Let's see if the project is already in LOCAL m2 repository
            fs.access( LocalJARFilePath, function(err14) {
              if (process.env.VERBOSE) console.log( `checking if ${LocalJARFilePath} exists or not.. .. ` );
              if (err14) { // a.k.a. if ( err14 && err14.code === 'ENOENT')

                // So.. LocalJARFilePath does *** NOT *** exist in local file system
                console.error( `Hmmm. ${LocalJARFilePath} does Not exist.\n${err14.message}` );
                console.error( "Without Maven.. Downloading from S3.  *** Not a secure way to do things ***"  );
                const S3FileName=`${groupId}.${artifactId}.${artifactId}-${version}.jar`;
                const URL1 = `https://s3.amazonaws.com/org.asux.cmdline/${S3FILENAME}`;
                EXECUTESHELLCMD.getURLAsFile( URL1, LocalJARFilePath, ( bSuccess, httpcode, httpmsg ) =>
                {
                  if ( ! bSuccess) {
                    console.error( __filename + "Serious internal failure: Failure to download from ["+ URL1 +"] httoCode="+ httpcode +", httpMsg=["+ httpmsg +"]");
                    process.exit(27);
                  } else { // if-else bSuccess
                    // Either the above get URL command returned a NON-zero error code, or an empty file
                    const fstats = fs.statSync(LocalJARFilePath);
                    if ( fstats.size <= 0 ) { // file is zero bytes!!!
                      console.error( __filename + "Serious internal failure: zero-byte download from: "+ URL1 );
                      process.exit(28);
                    }else{ // all ok with LocalJARFilePath
                      CLASSPATH=`${CLASSPATH}:${LocalJARFilePath}`;
                    } // if-else fstats.size
                  } // if-else bSuccess
                } ); // getURLAsFile(.. )

              }else{ // if-else err14
                // Ok. JAR file already exists ~/.m2
                const fstats = fs.statSync(LocalJARFilePath);
                var mtime = new Date(util.inspect(fstats.mtime));
                console.log(LocalJARFilePath +' '+ fstats.size +' '+ mtime );
              } // if-else err14
            }); // fs.access (MVNJARFilePath ..)

          } // if-else bIsMavenInstalled

      } // for lineObj of iterator


    } // if-else err
  }); // fs.readFile ( DependenciesFile .. )


} // end function readYAMLCmd

//============================================================
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//============================================================

// The Node.js process will exit on its own if there is no additional work pending in the event loop.
// The process.exitCode property can be set to tell the process which exit code to use when the process exits gracefully.
process.exitCode = 0;

//EoScript