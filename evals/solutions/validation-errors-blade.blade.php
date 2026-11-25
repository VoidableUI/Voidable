<div style="max-width: 28rem; margin: 0 auto; padding: var(--void-space-4);">
    <h1>Newsletter</h1>
    <form method="POST" action="/newsletter" style="display: grid; gap: var(--void-space-4);">
        @csrf
        <void-field label="Email" error="{{ $errors->first('email') }}">
            <void-input type="email" name="email" value="{{ $email }}" wire:model="email" required></void-input>
        </void-field>
        <div><void-button type="submit" variant="filled">Subscribe</void-button></div>
    </form>
</div>
