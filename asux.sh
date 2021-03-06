#!/bin/sh

### The following line did NOT work on Windows
# CMD="${BASH_SOURCE[0]}"
CMD="$0"
# echo $CMD
RUNTIMEFLDR="$(dirname "$CMD")"
# echo "RUNTIMEFLDR = ${RUNTIMEFLDR}"

##------------------------------
if [ "$SystemRoot" == "C:\\WINDOWS" ]; then
        echo "Detected Windows O/S"
        echo \
        "${RUNTIMEFLDR}/asux_forWindows" $@
        "${RUNTIMEFLDR}/asux_forWindows" $@
        exit $? ### Windows does Not respond well to shell's EXEC, hence this exit statement
fi

##------------------------------
if [ $# -le 2 ]; then
    echo "Usage: $0 <cmd> [--verbose]  " > /dev/stderr 2>&1
    echo 'Usage: $0 yaml [--verbose] -o /tmp/output2.yaml ' > /dev/stderr 2>&1
    echo '' > /dev/stderr 2>&1
    exit 1
fi

##------------------------------
MAVENLOCALREPO=`echo ~/.m2/repository`
# echo "MAVENLOCALREPO = '${MAVENLOCALREPO}'"

### Dont care if this command fails, but let's BARF all over user if something fails.
### git pull  >/dev/null 2>&1
git pull --quiet > /dev/stderr 2>&1

##------------------------------
CMDGRP="$1"

DEPENDENCIESFILE="${RUNTIMEFLDR}/etc/classpaths/${CMDGRP}-cmd.dependencies"
if [ -e "${DEPENDENCIESFILE}" ]; then
    # ls -la "${DEPENDENCIESFILE}"
    shift # get rid of $CMDGRP - from $*
else
    echo "${DEPENDENCIESFILE} does Not exist\!" > /dev/stderr 2>&1
    exit 2
fi

which mvn > /dev/null
if [ "$?" -ne 0 ]; then
    echo "Unable to run MAVEN ('mvn' command)" > /dev/stderr 2>&1
    exit 9
fi


##------------------------------
## Each INPUT-file must be generated using the command:-
##      mvn -DoutputFile=${DEPENDENCIESFILE}   dependency:tree
## It should then be hand-edited - to REMOVE the 1st 3 characters of each line.
## That's it!

REGEXP='^\(.*\):\(.*\):jar:\([0-9]*\.[0-9.]*\)$'

while read line; do
    # reading each line
    expr "$line" : '^#.*' > /dev/null
    notAComment=$?
    if [ "$notAComment" = "0" ] || [ "$line" = "" ]; then
        ## echo "Skipping line: [$line]"
        continue
    fi
    ## ______________________
    groupId=`echo $line | sed -e "s/${REGEXP}/\1/"`
    artifactId=`echo $line | sed -e "s/${REGEXP}/\2/"`
    ver=`echo $line | sed -e "s/${REGEXP}/\3/"`
    ## ______________________
    folderpath=`echo ${groupId} | sed -e 's|\.|/|g'`
    folderpath="${MAVENLOCALREPO}/${folderpath}/${artifactId}/${ver}"
    filename="${artifactId}-${ver}.jar"
    ## ______________________
    JARFILE="${folderpath}/${filename}"

    ## Let's see if the project is already in LOCAL m2 repository
    if [ -e "${JARFILE}" ]; then
        : ## NO-OP Bash statement.  As .. NOTHING TO DO
        ## ls -la "${folderpath}/${filename}"
    else
        ## So.. JAR does Not exist already in LOCAL m2 repository
        echo "downloading to ${MAVENLOCALREPO} .. "
        echo \
        mvn -q org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get -DrepoUrl=url \
            "-Dartifact=${groupId}:${artifactId}:${ver}"
        mvn -q org.apache.maven.plugins:maven-dependency-plugin:3.1.1:get -DrepoUrl=url \
            "-Dartifact=${groupId}:${artifactId}:${ver}"  > /dev/stderr 2>&1
        if [ "$?" != 0 ]; then
            echo "MAVEN could NOT download project from MAVEN-CENTRAL" > /dev/stderr 2>&1
            echo "So.. Downloading from S3.  Not a secure way to do things." > /dev/stderr 2>&1
            JARFILENAME="${artifactId}-${ver}.jar"
            LOCALJARFILEPATH="/tmp/${JARFILENAME}"
            S3FILENAME="${groupId}.${artifactId}.${artifactId}-${ver}.jar"
            echo \
            curl --silent -f https://s3.amazonaws.com/org.asux.cmdline/${S3FILENAME}
            ### If the URL does NOT point to an ACTUAL file in S3, CURL will still get a RESPONSE from S3.
            ### So that we can tell whether a file was downloaded or not.. use curl -f
            curl --silent -f https://s3.amazonaws.com/org.asux.cmdline/${S3FILENAME} \
                    > ${LOCALJARFILEPATH}
            ### Either the above CURL command returned a NON-zero error code, or an empty file
            if [ "$?" != 0 ] || [ ! -s ${LOCALJARFILEPATH} ]; then
                echo "Serious internal failure: Unable to install: " ${groupId}.${artifactId}-${ver}.jar
                exit 9
            else
                echo \
                mvn -q install:install-file -Dfile=${LOCALJARFILEPATH} \
                    -DgroupId=${groupId} -DartifactId=${artifactId} -Dversion=${ver} \
                    -Dpackaging=jar -DgeneratePom=true > /dev/stderr
                mvn -q install:install-file -Dfile=${LOCALJARFILEPATH} \
                    -DgroupId=${groupId} -DartifactId=${artifactId} -Dversion=${ver} \
                    -Dpackaging=jar -DgeneratePom=true > /dev/stderr 2>&1
            fi
        fi
    fi
    ## ______________________
    export CLASSPATH="${CLASSPATH}:${JARFILE}" ## to get the jndi.properties

done < "${DEPENDENCIESFILE}"

# echo "${CLASSPATH}"

##---------------------------------

## The ${CMDCLASS} is defined inside this
.  "${RUNTIMEFLDR}/etc/sh-source/$CMDGRP.sh-source"

##---------------------------------
### If there are spaces inside the variables, then "$@" retains the spaces, while "$*" does not

# echo \
# exec java -cp "${CLASSPATH}" "${CMDCLASS}" $@
exec java -cp "${CLASSPATH}" "${CMDCLASS}" $@

##---------------------------------
#EoScript
