<main style="max-width: 40rem; margin: 0 auto; padding: var(--void-space-4);">
  <h1>Account</h1>
  <void-tabs value="profile">
    <void-tab-panel tab="profile" label="Profile">
      <void-field label="Name">
        <void-input name="name"></void-input>
      </void-field>
    </void-tab-panel>
    <void-tab-panel tab="billing" label="Billing">
      <p>Plan: Pro, renews Dec 1, 2026</p>
    </void-tab-panel>
    <void-tab-panel tab="security" label="Security">
      <void-switch name="two_factor">Two-factor authentication</void-switch>
    </void-tab-panel>
  </void-tabs>
</main>
