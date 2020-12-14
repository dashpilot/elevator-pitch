<script>
import { onMount } from 'svelte';
import Editor from "./editor/Editor.svelte";

	onMount(async () => {
		window.splide = new Splide('#splide', {
			direction: 'ttb',
			height: '500px',
			speed: '1000',
			pagination: false
		}).mount();

	});

let data = {};
data.entries = [{
	id: "item-1",
	title: "Veel mooier nog",
	body: "Veel mooier nog<br>Dan stadions<br />Volgepakt met mensen",
	image: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
},
{
	id: "item-2",
	title: "",
	body: "Mensen met petten<br>en van die hysterische sjaaltjes",
	image: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
},
{
	id: "item-3",
	title: "",
	body: "Nee, veel mooier nog dan dat<br><br>is een streekvoetbalveld<br />leeg, maar fel verlicht<br />op een winteravond.",
	image: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
}];

function addSlide(){
	data.entries.push({id: "item-"+Date.now(), title: 'Lorem ipsum', body: 'Lorem ipsum dolor site amet'});
	data = data;
	localSave()
	window.setTimeout(function(){
		window.splide.refresh()
		window.splide.go(window.splide.length, true )
	}, 100)

}

function localSave(){
	console.log('save to localstorage');
	localStorage.setItem('data', JSON.stringify(data));
}

function save(){
	alert(JSON.stringify(data))
}

</script>

<div class="topbar">
	<div class="row no-gutters">
		<div class="col-3"><button class="btn btn-outline-dark" on:click="{addSlide}"><i class="fa fa-plus"></i></button></div>
		<div class="col-6 text-center pt-1">Elevator Pitch</div>
		<div class="col-3 text-right"><button class="btn btn-outline-dark"><i class="fa fa-save" on:click="{save}"></i></button></div>
	</div>
</div>

<div class="card" id="card1">
    <div class="splide" id="splide">
      <div class="splide__track">
        <ul class="splide__list">

				{#each data.entries as item}
          <li class="splide__slide">


            <div class="row no-gutters">
              <div class="col-3 side" data-name="bgimg" data-type="bgimg" style="background-image: url({item.image});"></div>
              <div class="col-9 main d-flex">
                <div class="justify-content-center align-self-center">

									<div class="editable" id="{item.id}" data-fields="title=txt&amp;body=rte&amp;image=pxl">
	                  {#if item.title}<h1>{item.title}</h1>{/if}
	                  <div class="text">{@html item.body}</div>
									</div>

                </div>
              </div>
            </div>


          </li>
					{/each}
        </ul>
      </div>
    </div>
  </div>


	<Editor bind:data />

	<style>
    .card {
      border: 0;

      max-width: 900px;
      height: 500px;
      margin: 0 auto;
      margin-top: 10%;
      overflow: hidden;
    }

    @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300&family=Playfair+Display&display=swap');

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-family: 'Playfair Display', serif;
    }

    h1 {
      line-height: 50px;
      padding-bottom: 5px;
    }

    .text {

      font-size: 20px;
      line-height: 32px;
    }

    .side {
      background-color: #5D3DC0;
      min-height: 500px;
      background-size: cover;
      background-position: center;
      background-image: url(https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800);
    }

    .main {
      padding: 40px;
    }
  </style>
