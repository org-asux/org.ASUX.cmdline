# org.ASUX.cmdline
<p>The top-level command line for ASUX family. Currently supports:-</p>
<ul><li><code>yaml</code> -- for YAML file processing</li></ul>

<h2>EXAMPLE</h2>
<p><code>./asux.csh <b>yaml</b> --list --yamlpath 'paths.*.(get|put|post).responses.200' -i ~/Documents/Development/src/API-OpenAPI-OAS3/org.ASUX.yaml//src/test/my-petstore-micro.yaml -o - </code></p>

<h4>Pattern rules for YAML commands</h4>
<p>See the companion project https://github.com/org-asux/org.ASUX.yaml</p>

<h2>The simplest and easiest way to get started?</h2>
<p><b>Warning</b>: For now this project requires Bourne-Shell(or T-CSH) and Maven - to do anything. It will be a long-time, before it will run on a plain-vanilla Windows laptop.</p>

<p><code>$ git clone https://github.com/org-asux/org.ASUX.cmdline</code></p>
<p><code>$ cd org.ASUX.cmdline</code></p>
<p><code>$ ./asux.sh</code></p>
<p><code>$ ./asux.csh</code></p>

The first time you run the asux.sh command, it will automatically download everything it needs!

<p>-- EOF --</p>
