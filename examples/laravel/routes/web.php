<?php

use App\Livewire\Lab;
use App\Livewire\LabTwo;
use App\Livewire\ShowcaseLive;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', ShowcaseLive::class);

// Pages for tests/browser/server/laravel (Livewire updates, wire:navigate, form posts).
Route::get('/lab', Lab::class);
Route::get('/lab/two', LabTwo::class);
Route::post('/lab/echo', fn (Request $request) => response()->json($request->except('_token')));
