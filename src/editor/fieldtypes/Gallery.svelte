<script>
import { onMount } from 'svelte';
export let key;
export let value;
export let data;
export let coll;
export let curIndex;


onMount(async () => {

  document.getElementById('fileInput').addEventListener('change', function(e) {

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


      let id = Date.now();
      data[coll][curIndex][key].push({id: id, filename: base64Image, title: id});
      data = data;
      console.log(data[coll][curIndex][key]);


/*
        fetch("api/save", {
            method: 'post',
            body: JSON.stringify({type: 'image', data: base64Image}),
          }).then(function(response) {
            return response.json();
          }).then(function(data) {
            console.log(data);
            item[key] = data.filename;
          })
          .catch(function(error) {
            console.log(error);
          });
          */


      // cleaning up
      URL.revokeObjectURL(img.src)

    }
    img.src = URL.createObjectURL(e.target.files[0]);

  })

});

function clickSelect(){
  document.querySelector('#fileInput').click();
}

function deleteImage(id){
  var r = confirm("Are you sure you want to delete this image?");
  if (r == true) {
    data[coll][curIndex][key] = data[coll][curIndex][key].filter(x => x.id !== id);
  }
}
</script>



<input type="file" class="fileInput" id="fileInput" accept="image/*" />

<button class="btn btn-outline-dark" on:click="{clickSelect}">Choose {key.replace('_', ' ')}</button>

<br />

{#if data[coll][curIndex][key].length > 0}
<ul class="list-group mt-2">
  {#each data[coll][curIndex][key] as img,i}
    <li class="list-group-item">

<div class="row no-gutters">
<div class="col-md-8">
    <div class="img-title">{img.title}</div>
</div>
<div class="col-md-4">
    <button class="btn btn-outline-dark delete-img float-right" on:click="{() => deleteImage(img.id)}">
    <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-trash" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
      <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
    </button>
</div>

    </li>
  {/each}
</ul>
{/if}

<style>
.fileInput{
  display: none;
}

.btn {
		display: inline-block;
		font-weight: 400;
		color: #212529;
		text-align: center;
		vertical-align: middle;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
		background-color: transparent;
		border: 1px solid transparent;
		border-top-color: transparent;
		border-right-color: transparent;
		border-bottom-color: transparent;
		border-left-color: transparent;
		padding: .375rem .75rem;
		font-size: 1rem;
		line-height: 1.5;
		border-radius: .25rem;
		transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
		cursor: pointer;
		text-decoration: none;
}

.btn-outline-dark {
		color: #343a40;
		border-color: #CCC;
		padding-left: 25px;
		padding-right: 25px;
}

.btn:hover {
		color: #212529;
		text-decoration: none;
}

.btn-outline-dark:hover {
		color: #fff;
		background-color: #343a40;
		border-color: #343a40;
}

.btn-primary{
	color: #fff;
	background-color: #007bff;
	border-color: #007bff;
}

.btn-primary:hover{
color: #fff;
background-color: #0069d9;
border-color: #0062cc;
}

.list-group-item{
  padding: 5px;
}

.img-title{
  padding: 6px;
  padding-left: 10px;
}

</style>
