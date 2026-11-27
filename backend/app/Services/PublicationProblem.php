<?php

namespace App\Services;

use RuntimeException;

final class PublicationProblem extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $problemCode,
        string $message,
        public readonly array $details = [],
    ) {
        parent::__construct($message);
    }
}
