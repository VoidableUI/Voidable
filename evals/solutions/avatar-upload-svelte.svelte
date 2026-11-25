<script>
  const MAX = 2 * 1024 * 1024;
  let file = $state(null);
  let error = $state('');

  // max-size on the element would drop a large file without telling anyone,
  // so check the size here and show the error ourselves.
  function onChange(e) {
    const f = e.detail.files[0] ?? null;
    if (f && f.size > MAX) {
      file = null;
      error = 'File is larger than 2 MB';
    } else {
      file = f;
      error = '';
    }
  }
</script>

<main style="max-width: 28rem; margin: 0 auto; padding: var(--void-space-4);">
  <h1>Profile photo</h1>
  <form action="/avatar" method="post" enctype="multipart/form-data" style="display: grid; gap: var(--void-space-4);">
    <void-field label="Profile photo" helper="PNG or JPEG, up to 2 MB" error={error}>
      <void-file-upload name="avatar" accept="image/png,image/jpeg" onvoid-change={onChange}></void-file-upload>
    </void-field>
    {#if file}
      <p>Selected: {file.name}</p>
    {/if}
    <div><void-button type="submit" variant="filled" disabled={!file}>Upload</void-button></div>
  </form>
</main>
