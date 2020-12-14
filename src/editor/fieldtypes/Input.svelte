<script>
export let item;
export let key;
export let val;

function handleKeyUp(e){

  let el = e.explicitOriginalTarget;
  let value = el.value;
  let name = el.getAttribute('name');

  item[key] = value;

  console.log(item);

}
</script>


<input type="text" name="{key}" class="form-control" value="{item[key]}" on:keyup={handleKeyUp}>

<style>
.form-control{
  margin-bottom: 10px;
}

</style>
