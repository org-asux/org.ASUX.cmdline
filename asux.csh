#!/bin/tcsh -f

##------------------------------
if ( $#argv <= 2 ) then
    echo "Usage: $0 <cmd> [--verbose]  " >>& /dev/stderr
    echo 'Usage: $0 yaml [--verbose] -o /tmp/output2.yaml ' >>& /dev/stderr
    echo '' >>& /dev/stderr
    exit 1
endif

##------------------------------
## WARNING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! This  "set" command must PRECEDE the noglob below
set MAVENLOCALREPO=`echo ~/.m2/repository`
## echo "MAVENLOCALREPO = '${MAVENLOCALREPO}'"

set noglob ## Very important to allow us to use '*' character on cmdline arguments

##------------------------------
## Ideally all of the following should be under the influence of "noglob"
set RUNTIMEFLDR=`which $0`
set RUNTIMEFLDR="$RUNTIMEFLDR:h"  ## this is NOT a duplicate.  The variable is recalculated.
## echo "RUNTIMEFLDR = $RUNTIMEFLDR"

set CMDGRP="$1"

set DEPENDENCIESFILE="${RUNTIMEFLDR}/etc/classpaths/${CMDGRP}-cmd.dependencies"
if ( -e "${DEPENDENCIESFILE}" ) then
    ## ls -la "${DEPENDENCIESFILE}"
    shift # get rid of $CMDGRP - from $*
else
    echo "${DEPENDENCIESFILE} does Not exist\!" >>& /dev/stderr
    exit 2
endif

which mvn > /dev/null
if ( "$status" != 0 ) then
    echo "Unable to run MAVEN ('mvn' command)" >>& /dev/stderr
    exit 9
endif


##------------------------------
#set v=`cat file`
#set i=1
#while ( $i < = $#v )
#    echo $v[$i]
#    @ i = $i + 1
#end

## Each INPUT-file must be generated using the command:-
##      mvn -DoutputFile=${DEPENDENCIESFILE}   dependency:tree
## It should then be hand-edited - to REMOVE the 1st 3 characters of each line.
## That's it!

set REGEXP='^\(.*\):\(.*\):jar:\([0-9]*\.[0-9.]*\)$'

foreach line ("`cat ${DEPENDENCIESFILE}`")
    expr "$line" : '^#.*' > /dev/null
    set notAComment=$status
    if ( ( ! $notAComment) || ("$line" == "") ) then
        ## echo "Skipping line: [$line]"
        continue
    endif
    ## ______________________
    set groupId=`echo $line | sed -e "s/${REGEXP}/\1/"`
    set artifactId=`echo $line | sed -e "s/${REGEXP}/\2/"`
    set ver=`echo $line | sed -e "s/${REGEXP}/\3/"`
    ## ______________________
    set folderpath=`echo ${groupId} | sed -e 's|\.|/|g'`
    set folderpath="${MAVENLOCALREPO}/${folderpath}/${artifactId}/${ver}"
    set filename="${artifactId}-${ver}.jar"
    ## ______________________
    set JARFILE="${folderpath}/${filename}"

    ## Let's see if the project is already in LOCAL m2 repository
    if ( -e "${JARFILE}" ) then
        ## NOTHING TO DO
        ## ls -la "${folderpath}/${filename}"
    else
        ## So.. JAR does Not exist already in LOCAL m2 repository
        echo \
        mvn -q org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get -DrepoUrl=url \
            "-Dartifact=${groupId}:${artifactId}:${ver}"
        mvn -q org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get -DrepoUrl=url \
            "-Dartifact=${groupId}:${artifactId}:${ver}"
        if ( "$status" != 0 ) then
            echo "MAVEN could NOT download project" >>& /dev/stderr
            echo mvn org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get -DrepoUrl=url \
                    "-Dartifact=${groupId}:${artifactId}:${ver}" >>& /dev/stderr
            exit 9
        endif
    endif
    ## ______________________
    setenv CLASSPATH ${CLASSPATH}:${JARFILE} ## to get the jndi.properties
end
## echo $CLASSPATH

##---------------------------------

## The ${CMDCLASS} is defined inside this
source "${RUNTIMEFLDR}/etc/csh-source/$CMDGRP.csh-source"

##---------------------------------
set noglob ## Very important to allow us to use '$*' character on cmdline arguments

## echo \
## java -cp "${CLASSPATH}" $CMDCLASS $*
java -cp "${CLASSPATH}" $CMDCLASS $*

##---------------------------------
#EoScript
