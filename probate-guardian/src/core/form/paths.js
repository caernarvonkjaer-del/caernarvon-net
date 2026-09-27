// Milestone 70, 70F: read and write a dotted path ('guardians.0.name') on a
// filing -- every data-form-path binding goes through these. Moved from
// legacy-app.js's FORM BINDING ENGINE.
export function getPath(obj,path){
  return path.split('.').reduce((o,k)=>o==null?undefined:o[k],obj);
}

export function setPath(obj,path,val){
  const keys=path.split('.');
  let cur=obj;
  for(let i=0;i<keys.length-1;i++){
    if(cur[keys[i]]==null)cur[keys[i]]={};
    cur=cur[keys[i]];
  }
  cur[keys[keys.length-1]]=val;
}
