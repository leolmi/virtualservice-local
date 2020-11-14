# Virtual Service offline

During the development of web applications the backend and the frontend often rely on different groups.
So you need to create a common REST call definition agreement.

If the backend is developed first, utilities such as [swagger](https://swagger.io/) or [postman](https://www.postman.com/)
are probably sufficient for the subsequent development of the client.
        
When it is necessary to first define REST calls, [<b>virtual-service</b>](https://virtualservice.herokuapp.com) becomes a practical solution.

With this tool you can run offline all serveices definited on on-line editor. 

## PREREQUISITES

- [nodejs](https://nodejs.org/it/)

## USE

- install virtualservice-local globally:
  ````
  $ npm i virtualservice-local -g
  ````

- download all service definitions you need from editor [https://virtualservice.herokuapp.com](https://virtualservice.herokuapp.com) and save files locally;
- run virtualservice-local serving files you need:
  ````
  $ vs "C:/local/path/file-downloaded-1.json" "C:/other/path/file-downloaded-2.json"
  ````

## OPTIONS
  ````
  $ vs [<options>] <files>
  ````
  options:
  
  `-p, --port` defines the port on which the server will be published (default=9010) <br>
  `--ip` defines the ip on which the server will be published (default=localhost) <br>
  

## SAMPLE

Suppose you download file `my-service-test.json` in a local path. So you can start virtual-service offline so:
````
$ vs "./my/local/path/my-service-test.json"
````

now your service is running on `http:localhost/9010` (9010 is default port) and you can call its methods:

````
http://localhost:9010/service/my-service/call/...
````

The same online call would have been:

````
https://virtualservice.herokuapp.com/service/my-service/call/...
````
