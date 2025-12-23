<?php

namespace App\Http\Controllers;

use App\Services\VersionCheckService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class UpgradeController extends Controller
{
    public function __construct(
        private VersionCheckService $versionCheckService,
    ) {}

    /**
     * Show the upgrade page.
     */
    public function index(): Response
    {
        $status = $this->versionCheckService->getVersionStatus();

        return Inertia::render('upgrade', [
            'versionStatus' => $status,
            'githubRepo' => $this->versionCheckService->getGitHubRepo(),
        ]);
    }

    /**
     * Check for updates (AJAX endpoint).
     */
    public function check(): JsonResponse
    {
        // Force refresh the cache
        $this->versionCheckService->refreshVersionData();
        $status = $this->versionCheckService->getVersionStatus();

        return response()->json($status);
    }
}
