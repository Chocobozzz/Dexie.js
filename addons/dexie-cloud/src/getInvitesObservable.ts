import { Dexie, liveQuery } from 'dexie';
import { DBRealmMember } from 'dexie-cloud-common';
import { combineLatest, map, switchMap } from 'rxjs';
import { associate } from './associate';
import { createSharedValueObservable } from './createSharedValueObservable';
import { getCurrentUserEmitter } from './currentUserEmitter';
import { getInternalAccessControlObservable } from './getInternalAccessControlObservable';
import { getPermissionsLookupObservable } from './getPermissionsLookupObservable';
import { Invite } from './Invite';
import { mapValueObservable } from './mapValueObservable';

export const getInvitesObservable = associate((db: Dexie) => {
  const membersByEmail = getCurrentUserEmitter(db._novip).pipe(
    switchMap((currentUser) =>
      liveQuery(() =>
        db.members.where({ email: currentUser.email || '' }).toArray()
      )
    )
  );
  const permissions = getPermissionsLookupObservable(db._novip);
  const accessControl = getInternalAccessControlObservable(db._novip);
  return createSharedValueObservable(
    combineLatest([membersByEmail, accessControl, permissions]).pipe(
      map(([membersByEmail, accessControl, realmLookup]) => {
        const reducer = (
          result: { [id: string]: Invite },
          m: DBRealmMember
        ) => ({ ...result, [m.id!]: { ...m, realm: realmLookup[m.realmId] } });
        const emailMembersById = membersByEmail.reduce(reducer, {});
        const membersById = accessControl.selfMembers.reduce(
          reducer,
          emailMembersById
        );
        return Object.values(membersById).filter(m => !m.accepted);
      })
    ),
    []
  );
});
