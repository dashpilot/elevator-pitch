<svelte:head>
<style>
.editable{
	border: 1px solid transparent;
}
.editable:hover{
	border: 1px dashed #999;
	cursor: pointer;
}
</style>
</svelte:head>

<script>
import {fade, fly} from "svelte/transition";
import TinyText from "./fieldtypes/TinyText.svelte";
import Pexels from "./fieldtypes/Pexels.svelte";

import { onMount } from 'svelte';


	onMount(async () => {

	if(typeof localStorage.getItem('data') !== 'undefined'){
		data = JSON.parse(localStorage.getItem('data'));
	}

	});

export let data;
let curId = false;
let fields = false;
let curIndex = false;
let item;

document.body.addEventListener('click', function(e){

		if(e.target.closest('.editable')){
		let target = e.target.closest('.editable');
		let id = target.id;

		let myfields = target.getAttribute('data-fields');
		var params = new URLSearchParams(myfields);
		fields = Object.fromEntries(params.entries())
		console.log(fields);
		item = data.entries.filter(x => x.id == id)[0];
		curIndex = data.entries.findIndex(x => x.id == id);
    curId = id;

		}

})

function localSave(){
	console.log('save to localstorage');
	localStorage.setItem('data', JSON.stringify(data));
  curId = false;
}

</script>

{#if curId}
<div class="card" transition:fly="{{x: 400}}">
  <div class="card-header">
    Edit <span class="close" on:click="{() => curId = false}">&times;</span>
  </div>
  <div class="card-body">

  {#each Object.entries(fields) as [key, val] (key) }

		{#if val === 'txt'}
			<div class="label">{key.replace('_', ' ')}</div>
      <input type="text" class="form-control" bind:value="{data.entries[curIndex][key]}" />
    {/if}


  {#if val=='rte'}
	<div class="label">{key.replace('_', ' ')}</div>
	<TinyText bind:key={item[key]} bind:value="{data.entries[curIndex][key]}" bind:data buttons={['bold','italic','link']} />
  {/if}


	{#if val=='pxl'}
	<div class="label">{key.replace('_', ' ')}</div>
 	<Pexels bind:key bind:value="{data.entries[curIndex][key]}" bind:data bind:curIndex  />
	{/if}

    {/each}

    <a href="#" class="btn btn-primary" on:click={localSave}>Save</a>
  </div>
</div>
{/if}

<style>
.card{
  width: 400px;
  position: fixed;
  top: 0px;
  right: 0px;
  height: 100%;
  z-index: 5000;
  border-radius: 0;
  border-top: 0;
  border-right: 0;
  overflow-y: auto;
}

.label{
	text-transform: uppercase;
	font-size: 14px;
	letter-spacing: 0.03em;
	margin-bottom: 5px;
	margin-top: 15px;
}

.form-control{
  margin-bottom: 15px;
}

.close{
  cursor: pointer;
}
</style>
