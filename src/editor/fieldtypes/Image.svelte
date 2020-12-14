<script>
import { afterUpdate } from 'svelte';
import { saveImage } from '../helpers/Api.svelte'
export let key;
export let value;
export let data;
export let curIndex;
export let user;



afterUpdate(async () => {

  document.getElementById('fileInput-'+key).addEventListener('change', function(e) {

    var width = 800;
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas'),
        ctx = canvas.getContext("2d"),
        oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

      canvas.width = width; // destination canvas size
      canvas.height = canvas.width * img.height / img.width;

      var cur = {
        width: Math.floor(img.width * 0.5),
        height: Math.floor(img.height * 0.5)
      }

      oc.width = cur.width;
      oc.height = cur.height;

      octx.drawImage(img, 0, 0, cur.width, cur.height);

      while (cur.width * 0.5 > width) {
        cur = {
          width: Math.floor(cur.width * 0.5),
          height: Math.floor(cur.height * 0.5)
        };
        octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
      }

      ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);
      var base64Image = canvas.toDataURL('image/png')

      //console.log(base64Image);

      data.entries[curIndex][key] = base64Image;

    if(user){
      saveImage(base64Image, user).then(function(result){
        data.entries[curIndex][key] = result.filename;
        window.shareData(data);
      });
    }else{
      window.shareData(data);
    }

      // cleaning up
      URL.revokeObjectURL(img.src)

    }
    img.src = URL.createObjectURL(e.target.files[0]);

  })

});

function clickSelect(){
  document.querySelector('#fileInput-'+key).click();
}

function deleteImage(mykey){

  data.entries[curIndex][mykey] = '';
  window.shareData(data);
}
</script>



<input type="file" class="fileInput" id="fileInput-{key}" accept="image/*" data-name="{key}" />
<div class="btn-group w-50 mb-2">
<button class="btn btn-outline-secondary" on:click="{clickSelect}">Upload</button>

{#if data.entries[curIndex][key]}
<button class="btn btn-outline-secondary delete-img" on:click="{() => deleteImage(key)}">
<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-trash" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
</svg>
</button>
{/if}
</div>
<br />



<style>
.fileInput{
  display: none;
}
</style>
