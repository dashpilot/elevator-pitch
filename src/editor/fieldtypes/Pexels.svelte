<script>
export let data;
export let key;
export let value;
export let curIndex;
let search = '';
let photos = [];

function searchPexels(){
  console.log('searching'+search);
  fetch("https://api.pexels.com/v1/search?query=" + search, {
          headers: {
            Authorization: '563492ad6f9170000100000193a694091f5340f3963db995f31bb5e6'
          }
        })
        .then(response => response.json())
        .then(function(result) {
          console.log(key)
          result.photos.forEach(function(item) {
            photos.push({url: item.src.portrait})
          })
          photos = photos;
        })
        .catch(err => console.log(err))
}
</script>



      <div class="input-group">
        <input type="text" class="form-control" placeholder="e.g. mountains, stars" bind:value={search}>
        <div class="input-group-append">
          <button class="btn btn-outline-secondary" type="button" id="button-addon2" on:click="{searchPexels}">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" id="loading" style="display: none;"></span>
            Search Image</button>
        </div>
      </div>

      <div id="photos" class="mb-3 mt-2">
        {#each photos as photo}
        <img src="{photo.url}" on:click="{() => data.entries[curIndex][key] = photo.url}" class="img-fluid mt-2" />
        {/each}
      </div>
