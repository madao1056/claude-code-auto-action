#!/bin/bash

# n8n Workflow Auto-Approval Script
# Automatically approves n8n workflow operations

# Configuration
N8N_API_KEY="${N8N_API_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMzIyZDFmYi0yNjg3LTQxY2ItOGZlOC01NjllYmVkNjZjMWMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUxODk0MDg5fQ.aKV9wBKm6inEsdLzSyNltW0u69PvmXQ59T8oSyoicZc}"
N8N_BASE_URL="${N8N_BASE_URL:-http://localhost:5678}"

# Function to approve workflow operations
approve_n8n_operation() {
    local operation="$1"
    local workflow_file="$2"
    
    case "$operation" in
        "create"|"import")
            echo "Auto-approving n8n workflow import..."
            curl -X POST "${N8N_BASE_URL}/api/v1/workflows" \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
                -H "Content-Type: application/json" \
                -d @"${workflow_file}"
            ;;
        "update")
            local workflow_id="$3"
            echo "Auto-approving n8n workflow update..."
            curl -X PUT "${N8N_BASE_URL}/api/v1/workflows/${workflow_id}" \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
                -H "Content-Type: application/json" \
                -d @"${workflow_file}"
            ;;
        "delete")
            local workflow_id="$3"
            echo "Auto-approving n8n workflow deletion..."
            curl -X DELETE "${N8N_BASE_URL}/api/v1/workflows/${workflow_id}" \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}"
            ;;
        "activate")
            local workflow_id="$3"
            echo "Auto-approving n8n workflow activation..."
            curl -X PATCH "${N8N_BASE_URL}/api/v1/workflows/${workflow_id}" \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
                -H "Content-Type: application/json" \
                -d '{"active": true}'
            ;;
        "deactivate")
            local workflow_id="$3"
            echo "Auto-approving n8n workflow deactivation..."
            curl -X PATCH "${N8N_BASE_URL}/api/v1/workflows/${workflow_id}" \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
                -H "Content-Type: application/json" \
                -d '{"active": false}'
            ;;
        *)
            echo "Unknown operation: $operation"
            exit 1
            ;;
    esac
}

# Main script
main() {
    local operation="${1:-import}"
    local workflow_file="${2:-/tmp/workflow1.json}"
    local workflow_id="${3:-}"
    
    # Check if workflow file exists for operations that need it
    if [[ "$operation" =~ ^(create|import|update)$ ]] && [[ ! -f "$workflow_file" ]]; then
        echo "Error: Workflow file not found: $workflow_file"
        exit 1
    fi
    
    # Execute the operation
    approve_n8n_operation "$operation" "$workflow_file" "$workflow_id"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi