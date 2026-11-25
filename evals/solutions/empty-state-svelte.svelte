<script>
  let projects = $state([]);
</script>

<main style="padding: var(--void-space-6) var(--void-space-4); max-width: 64rem; margin: 0 auto;">
  <h1>Projects</h1>
  {#if projects.length === 0}
    <section style="display: grid; justify-items: center; text-align: center; gap: var(--void-space-4); padding: var(--void-space-12) var(--void-space-4);">
      <h2>No projects yet</h2>
      <p>A project groups the boards, files and people working toward one goal.</p>
      <void-button variant="filled" onvoid-click={() => (location.href = '/projects/new')}>Create project</void-button>
    </section>
  {:else}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: var(--void-space-4);">
      {#each projects as project (project.id)}
        <void-card>
          <void-card-header>
            <void-card-title>{project.name}</void-card-title>
          </void-card-header>
          <void-card-body>
            <p>Updated {project.updatedAt}</p>
          </void-card-body>
        </void-card>
      {/each}
    </div>
  {/if}
</main>
