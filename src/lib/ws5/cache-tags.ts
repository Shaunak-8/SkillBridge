/** Cache tag and lifetime for the public project board. Publishing or changing a project invalidates the tag. */
export const PROJECTS_BOARD_TAG = 'projects-board';
/** Upper bound on how stale the board can be if an invalidation is missed. */
export const PROJECTS_BOARD_REVALIDATE_SECONDS = 60;
