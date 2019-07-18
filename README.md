# virtualservice local
virtual service simulator

## local runner for virtualservice

## USE

- install virtualservice-local globally:
  ````
  npm i virtualservice-local -g
  ````

- download all service definitions you need from editor `http://virtualservice.herokuapp.com` and save files locally;
- run virtualservice-local serving files you need:
  ````
  vs "C:/local/path/file-downloaded-1.json" "C:/other/path/file-downloaded-2.json"
  ````

## OPTIONS
  ````
  vs [<options>] <files>
  ````
  options:
  
  `-p, --port` definisce la porta su cui verrà pubblicato il server (default=9010) <br>
  `--ip` definisce l'ip su cui verrà pubblicato il server (default=localhost) <br>
  
