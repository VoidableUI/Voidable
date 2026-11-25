<main style="max-width: 40rem; margin: 0 auto; padding: var(--void-space-4);">
  <h1>Account</h1>
  <void-tabs value="profile">
    <void-tabs-list>
      <void-tabs-trigger value="profile">Profile</void-tabs-trigger>
      <void-tabs-trigger value="billing">Billing</void-tabs-trigger>
      <void-tabs-trigger value="security">Security</void-tabs-trigger>
    </void-tabs-list>
    <void-tabs-content value="profile">
      <void-field label="Name">
        <void-input name="name"></void-input>
      </void-field>
    </void-tabs-content>
    <void-tabs-content value="billing">
      <p>Plan: Pro, renews Dec 1, 2026</p>
    </void-tabs-content>
    <void-tabs-content value="security">
      <void-switch name="two_factor">Two-factor authentication</void-switch>
    </void-tabs-content>
  </void-tabs>
</main>
