type RelationshipObject = {
  id?: number | string
  value?: number | string | { id?: number | string } | null
}

export const extractRelationshipID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const relation = value as RelationshipObject

  if (typeof relation.id === 'number' || typeof relation.id === 'string') {
    return relation.id
  }

  if (typeof relation.value === 'number' || typeof relation.value === 'string') {
    return relation.value
  }

  if (relation.value && typeof relation.value === 'object') {
    const nested = relation.value as { id?: number | string }

    if (typeof nested.id === 'number' || typeof nested.id === 'string') {
      return nested.id
    }
  }

  return null
}
