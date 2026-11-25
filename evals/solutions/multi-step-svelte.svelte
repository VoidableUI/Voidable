<script>
  const steps = ['Account', 'Profile', 'Review'];
  let step = $state(0);
  let email = $state('');
  let password = $state('');
  let fullName = $state('');
  let role = $state('');
  let errors = $state({});

  function validate() {
    const e = {};
    if (step === 0) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email address';
      if (password.length < 8) e.password = 'Use at least 8 characters';
    }
    if (step === 1) {
      if (!fullName.trim()) e.full_name = 'Enter your full name';
      if (!role) e.role = 'Choose a role';
    }
    errors = e;
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validate()) step += 1;
  }
</script>

<main style="max-width: 32rem; margin: 0 auto; padding: var(--void-space-4); display: grid; gap: var(--void-space-6);">
  <h1>Create your account</h1>
  <void-stepper steps={steps.join(',')} value={step}></void-stepper>

  <form action="/signup" method="post" style="display: grid; gap: var(--void-space-4);">
    <!-- Every field stays in the form so the final submit carries them all. -->
    <div style="display: {step === 0 ? 'grid' : 'none'}; gap: var(--void-space-4);">
      <h2>Account</h2>
      <void-field label="Email" error={errors.email || ''}>
        <void-input type="email" name="email" value={email} onvoid-input={(e) => (email = e.detail.value)}></void-input>
      </void-field>
      <void-field label="Password" helper="At least 8 characters" error={errors.password || ''}>
        <void-input type="password" name="password" value={password} onvoid-input={(e) => (password = e.detail.value)}></void-input>
      </void-field>
    </div>

    <div style="display: {step === 1 ? 'grid' : 'none'}; gap: var(--void-space-4);">
      <h2>Profile</h2>
      <void-field label="Full name" error={errors.full_name || ''}>
        <void-input name="full_name" value={fullName} onvoid-input={(e) => (fullName = e.detail.value)}></void-input>
      </void-field>
      <void-field label="Role" error={errors.role || ''}>
        <void-select name="role" placeholder="Choose a role" value={role} onvoid-change={(e) => (role = e.detail.value)}>
          <option value="developer">Developer</option>
          <option value="designer">Designer</option>
          <option value="manager">Manager</option>
        </void-select>
      </void-field>
    </div>

    {#if step === 2}
      <section>
        <h2>Review</h2>
        <dl>
          <dt>Email</dt><dd>{email}</dd>
          <dt>Full name</dt><dd>{fullName}</dd>
          <dt>Role</dt><dd>{role.charAt(0).toUpperCase() + role.slice(1)}</dd>
        </dl>
      </section>
    {/if}

    <div style="display: flex; gap: var(--void-space-2); justify-content: space-between;">
      {#if step > 0}
        <void-button onvoid-click={() => (step -= 1)}>Back</void-button>
      {:else}
        <span></span>
      {/if}
      {#if step < 2}
        <void-button variant="filled" onvoid-click={next}>Next</void-button>
      {:else}
        <void-button type="submit" variant="filled">Create account</void-button>
      {/if}
    </div>
  </form>
</main>
