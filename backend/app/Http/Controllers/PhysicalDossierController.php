<?php

namespace App\Http\Controllers;

use App\Models\PhysicalDossier;
use App\Models\NomenclatureEntry;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class PhysicalDossierController
{
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->query(), [
            'nomenclature_entry_id' => 'sometimes|required|integer|exists:nomenclature_entries,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['eroare' => 'Clasificarea selectată nu este validă.', 'cod' => 'invalid_classification'], 422);
        }

        $query = PhysicalDossier::query();
        if ($request->filled('nomenclature_entry_id')) {
            $entry = NomenclatureEntry::query()->findOrFail($request->integer('nomenclature_entry_id'));
            $query->where('archival_indicator', $entry->archival_indicator)
                ->where('retention_time', $entry->retention_term);
        }

        return response()->json(['dossiers' => $query->orderBy('physical_dossier_number')->get([
                'id', 'physical_dossier_number', 'archival_indicator', 'inventory_number', 'retention_time', 'description',
            ])]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['physical_dossier_number' => trim((string) $request->input('physical_dossier_number', ''))]);
        $validator = Validator::make($request->all(), [
            'nomenclature_entry_id' => 'required|integer|exists:nomenclature_entries,id',
            'physical_dossier_number' => 'required|string|max:255|unique:physical_dossiers,physical_dossier_number',
            'inventory_number' => 'required|string|max:255',
            'description' => 'sometimes|nullable|string|max:500',
        ]);
        if ($validator->fails()) {
            $duplicate = $validator->errors()->has('physical_dossier_number')
                && PhysicalDossier::query()->where('physical_dossier_number', trim((string) $request->input('physical_dossier_number')))->exists();
            return response()->json([
                'eroare' => $duplicate ? 'Există deja un dosar fizic cu acest număr.' : 'Datele dosarului fizic nu sunt valide.',
                'cod' => $duplicate ? 'duplicate_dossier_number' : 'invalid_dossier',
            ], 422);
        }

        $values = $validator->validated();
        $entry = NomenclatureEntry::query()->findOrFail($values['nomenclature_entry_id']);
        $values['physical_dossier_number'] = trim($values['physical_dossier_number']);
        unset($values['nomenclature_entry_id']);
        $values['archival_indicator'] = $entry->archival_indicator;
        $values['retention_time'] = $entry->retention_term;
        try {
            $dossier = PhysicalDossier::query()->create($values);
        } catch (QueryException $exception) {
            if (($exception->errorInfo[0] ?? null) !== '23505') {
                throw $exception;
            }
            return response()->json([
                'eroare' => 'Există deja un dosar fizic cu acest număr.',
                'cod' => 'duplicate_dossier_number',
            ], 422);
        }

        return response()->json(['dossier' => $dossier], 201);
    }
}
