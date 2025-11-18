import { PostgresGraphStore } from '@defense/graph-store';
import { EntityType } from '@defense/schema';
import type { ValidationReport, ConfidenceIssue } from '@defense/schema';

/**
 * Graph integrity validator
 */
export class GraphValidator {
  /**
   * Validate graph and generate report
   */
  async validateGraph(graph: PostgresGraphStore): Promise<ValidationReport> {
    const nodeCount = await graph.getNodeCount();
    const edgeCount = await graph.getEdgeCount();

    // Detect orphan nodes
    const orphanNodes = await graph.getOrphans();

    // Check schema violations
    const schemaViolations = await this.checkSchemaViolations(graph);

    // Check confidence issues
    const confidenceIssues = await this.checkConfidenceIssues(graph);

    // Detect duplicate entities (same name, different IDs)
    const duplicateEntities = await this.findDuplicates(graph);

    // Find missing types (nodes with undefined or invalid types)
    const missingTypes = await this.checkMissingTypes(graph);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      orphanNodes,
      schemaViolations,
      confidenceIssues,
      duplicateEntities,
      missingTypes,
    });

    return {
      validation_results: {
        total_entities: nodeCount,
        total_relations: edgeCount,
        orphan_nodes: orphanNodes.map((n) => n.id),
        schema_violations: schemaViolations,
        confidence_issues: confidenceIssues,
        duplicate_entities: duplicateEntities,
        missing_types: missingTypes,
      },
      recommendations,
    };
  }

  /**
   * Check for schema violations
   */
  private async checkSchemaViolations(graph: PostgresGraphStore): Promise<string[]> {
    const violations: string[] = [];
    const allNodes = await graph.getAllNodes();

    // Check for valid entity types
    const validTypes = new Set(EntityType.options);

    allNodes.forEach((node) => {
      if (!validTypes.has(node.type as any)) {
        violations.push(
          `Node ${node.id} has invalid type: ${node.type}`
        );
      }
    });

    return violations;
  }

  /**
   * Check for confidence issues in edges
   */
  private async checkConfidenceIssues(graph: PostgresGraphStore): Promise<ConfidenceIssue[]> {
    const issues: ConfidenceIssue[] = [];
    const allEdges = await graph.getAllEdges();

    allEdges.forEach((edge) => {
      if (edge.confidence < 0.5) {
        issues.push({
          triple: `${edge.source} --[${edge.relation}]--> ${edge.target}`,
          issue: `Confidence ${edge.confidence} is below minimum threshold of 0.5`,
        });
      }

      if (edge.confidence > 1.0) {
        issues.push({
          triple: `${edge.source} --[${edge.relation}]--> ${edge.target}`,
          issue: `Confidence ${edge.confidence} exceeds maximum of 1.0`,
        });
      }
    });

    return issues;
  }

  /**
   * Find duplicate entities (same data.name, different IDs)
   */
  private async findDuplicates(graph: PostgresGraphStore): Promise<string[]> {
    const allNodes = await graph.getAllNodes();
    const nameMap = new Map<string, string[]>();

    // Group nodes by name
    allNodes.forEach((node) => {
      const name = node.data.name || node.id;
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)!.push(node.id);
    });

    // Find names with multiple IDs
    const duplicates: string[] = [];
    nameMap.forEach((ids, name) => {
      if (ids.length > 1) {
        duplicates.push(`"${name}" appears as: ${ids.join(', ')}`);
      }
    });

    return duplicates;
  }

  /**
   * Check for nodes with missing or undefined types
   */
  private async checkMissingTypes(graph: PostgresGraphStore): Promise<string[]> {
    const allNodes = await graph.getAllNodes();
    const missing: string[] = [];

    allNodes.forEach((node) => {
      if (!node.type || node.type === undefined) {
        missing.push(node.id);
      }
    });

    return missing;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: {
    orphanNodes: any[];
    schemaViolations: string[];
    confidenceIssues: ConfidenceIssue[];
    duplicateEntities: string[];
    missingTypes: string[];
  }): string[] {
    const recommendations: string[] = [];

    if (results.orphanNodes.length > 0) {
      recommendations.push(
        `Remove or connect ${results.orphanNodes.length} orphan node(s) with no relationships`
      );
    }

    if (results.schemaViolations.length > 0) {
      recommendations.push(
        `Fix ${results.schemaViolations.length} schema violation(s) with invalid entity types`
      );
    }

    if (results.confidenceIssues.length > 0) {
      recommendations.push(
        `Address ${results.confidenceIssues.length} confidence issue(s) - remove or update low-confidence edges`
      );
    }

    if (results.duplicateEntities.length > 0) {
      recommendations.push(
        `Merge ${results.duplicateEntities.length} duplicate entity name(s) - normalize entity IDs`
      );
    }

    if (results.missingTypes.length > 0) {
      recommendations.push(
        `Add type information to ${results.missingTypes.length} node(s) with missing types`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Graph validation passed - no issues found');
    }

    return recommendations;
  }
}

/**
 * Convenience function to validate a graph
 */
export async function validateGraph(graph: PostgresGraphStore): Promise<ValidationReport> {
  const validator = new GraphValidator();
  return await validator.validateGraph(graph);
}
