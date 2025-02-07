import Dexie from 'dexie';
import { DBPermissionSet, DBRealm, DBRealmMember } from 'dexie-cloud-common';
import { Observable } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { associate } from './associate';
import { getInternalAccessControlObservable } from './getInternalAccessControlObservable';
import { mapValueObservable } from './mapValueObservable';
import { mergePermissions } from './mergePermissions';

export type PermissionsLookup = {
  [realmId: string]: DBRealm & { permissions: DBPermissionSet };
};

export type PermissionsLookupObservable = Observable<PermissionsLookup> & {
  getValue(): PermissionsLookup;
};

export const getPermissionsLookupObservable = associate((db: Dexie) => {
  const o = getInternalAccessControlObservable(db._novip);

  return mapValueObservable(o, ({ selfMembers, realms, userId }) => {
    const rv = realms
      .map((realm) => ({
        ...realm,
        permissions:
          realm.owner === userId
            ? ({ manage: '*' } as DBPermissionSet)
            : mergePermissions(
                ...selfMembers
                  .filter((m) => m.realmId === realm.realmId)
                  .map((m) => m.permissions!)
                  .filter((p) => p)
              ),
      }))
      .reduce((p, c) => ({ ...p, [c.realmId]: c }), {
        [userId!]: {
          realmId: userId,
          owner: userId,
          name: userId,
          permissions: { manage: '*' },
        } as DBRealm & { permissions: DBPermissionSet },
      });
    return rv;
  });
});
