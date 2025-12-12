'use client';

import {
    closestCorners,
    pointerWithin,
    rectIntersection,
} from '@dnd-kit/core';

export const createKanbanCollisionDetection = () => {
    // TODO: Replace 'any' with proper dnd-kit CollisionDetection arguments type
    return (args: any) => {
        const pointerCollisions = pointerWithin(args);
        const archivePointerCollision = pointerCollisions.find((c: any) => c.id === 'archive');
        if (archivePointerCollision) {
            return [archivePointerCollision];
        }
        if (pointerCollisions.length > 0) {
            return pointerCollisions;
        }
        const rectCollisions = rectIntersection(args);
        const archiveRectCollision = rectCollisions.find((c: any) => c.id === 'archive');
        if (archiveRectCollision) {
            return [archiveRectCollision];
        }
        return closestCorners(args);
    };
};
