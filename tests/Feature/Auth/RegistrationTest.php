<?php

// Registration is disabled - invite-only registration via invitations.register route
// These tests are skipped as the standard register routes don't exist

test('registration screen can be rendered', function () {
    // Standard registration is disabled in this app
    // Users can only register via invitations
})->skip('Registration disabled - invite-only');

test('new users can register', function () {
    // Standard registration is disabled in this app
    // Users can only register via invitations
})->skip('Registration disabled - invite-only');
