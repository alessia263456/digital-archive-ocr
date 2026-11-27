<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class FolderPermissionScope
{
    public function dossierIds(User $user): ?array
    {
        if ($user->role !== 'cititor') return null;

        return DB::table('physical_dossiers as dossier')
            ->leftJoin('folder_permissions as individual', function ($join) use ($user): void {
                $join->on('individual.physical_dossier_id', '=', 'dossier.id')
                    ->where('individual.principal_type', '=', 'user')
                    ->where('individual.user_id', '=', $user->id);
            })
            ->leftJoin('folder_permissions as role_permission', function ($join): void {
                $join->on('role_permission.physical_dossier_id', '=', 'dossier.id')
                    ->where('role_permission.principal_type', '=', 'role')
                    ->whereNull('role_permission.user_id');
            })
            ->whereRaw('COALESCE(individual.allowed, role_permission.allowed, false) = true')
            ->pluck('dossier.id')->map(fn ($id): int => (int) $id)->all();
    }

    public function constrain(Builder $query, User $user, string $column = 'physical_dossier_id'): Builder
    {
        $ids = $this->dossierIds($user);
        return $ids === null ? $query : $query->whereIn($column, $ids);
    }
}
