#import "NotificationService.h"
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

// ---------------------------------------------------------------------------
// Interactive notifications (docs/interactive-notifications.md, "iOS").
//
// iOS shows a notification's actions from the category named in the payload, and
// that category has to exist before the notification is shown. Ours differ per
// notification, so this extension builds one from the `pple_interaction` data key
// and registers it before handing the content on. The tap is handled natively by
// `modules/notification-actions`. The icon names below mirror the allowlist in
// `@pple-today/api-common` (NOTIFICATION_INTERACTION_ICONS) and `utils/tray-interaction.ts`:
// adding an icon means updating all three.
//
// Everything here is fail-safe. If anything is missing, malformed or slow, the
// notification is shown without actions and a tap opens the form, exactly as on a
// client without tray support.
// ---------------------------------------------------------------------------

static NSString *const kPPLECategoryPrefix = @"pple.ix.";
static const NSUInteger kPPLEMaxCategories = 50;
// Insertion order of the `pple.ix.*` categories this extension registered, oldest
// first. `UNNotificationCategory` carries no timestamp and the set returned by
// `getNotificationCategories` is unordered, so "newest 50" needs a record of
// order. The extension's own standard defaults are enough: only this extension
// ever creates these categories, so nothing needs to read the list from the app,
// and no app group is needed. A category missing from the list (the list was
// lost) counts as oldest.
static NSString *const kPPLECategoryOrderKey = @"pple.ix.category-order";
// How long to wait for `getNotificationCategories`. The extension gets roughly 30
// seconds; this leaves nearly all of it for the image download.
static const int64_t kPPLECategoriesTimeoutSeconds = 3;

static NSDictionary<NSString *, NSString *> *PPLESymbolMap(void) {
    static NSDictionary *map;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        map = @{
            @"check": @"checkmark",
            @"x": @"xmark",
            @"thumbs-up": @"hand.thumbsup",
            @"thumbs-down": @"hand.thumbsdown",
            @"calendar-check": @"calendar.badge.checkmark",
            @"calendar-x": @"calendar.badge.minus",
            @"clock": @"clock",
            @"send": @"paperplane",
            @"heart": @"heart",
            @"star": @"star",
            @"flag": @"flag",
            @"user-check": @"person.badge.checkmark",
            @"user-x": @"person.badge.minus",
            @"help": @"questionmark.circle",
        };
    });
    return map;
}

static BOOL PPLEIsNonEmptyString(id value) {
    return [value isKindOfClass:[NSString class]] && [(NSString *)value length] > 0;
}

static UNNotificationActionIcon *PPLEIconForName(id name) API_AVAILABLE(ios(15.0)) {
    if (!PPLEIsNonEmptyString(name)) {
        return nil;
    }
    NSString *symbol = PPLESymbolMap()[name];
    return symbol ? [UNNotificationActionIcon iconWithSystemImageName:symbol] : nil;
}

// The interaction as a dictionary, whether it arrived as a JSON string (FCM data
// values are strings) or already parsed.
static NSDictionary *PPLEParseInteraction(NSDictionary *userInfo) {
    id raw = userInfo[@"pple_interaction"];
    if ([raw isKindOfClass:[NSString class]]) {
        NSData *data = [(NSString *)raw dataUsingEncoding:NSUTF8StringEncoding];
        raw = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
    }
    if (![raw isKindOfClass:[NSDictionary class]] || !PPLEIsNonEmptyString(raw[@"id"])) {
        return nil;
    }
    return raw;
}

static UNNotificationAction *PPLEMakeAction(NSString *identifier,
                                            NSString *title,
                                            id iconName,
                                            BOOL destructive,
                                            BOOL foreground,
                                            NSString *textButtonTitle,
                                            NSString *textPlaceholder) {
    // Unlock first for every action: approving something from a locked phone that
    // someone else is holding shouldn't be possible.
    UNNotificationActionOptions options = UNNotificationActionOptionAuthenticationRequired;
    if (destructive) {
        options |= UNNotificationActionOptionDestructive;
    }
    if (foreground) {
        options |= UNNotificationActionOptionForeground;
    }
    UNNotificationActionIcon *icon = nil;
    if (@available(iOS 15.0, *)) {
        icon = PPLEIconForName(iconName);
    }
    if (textButtonTitle) {
        if (@available(iOS 15.0, *)) {
            return [UNTextInputNotificationAction actionWithIdentifier:identifier
                                                                 title:title
                                                               options:options
                                                                  icon:icon
                                                  textInputButtonTitle:textButtonTitle
                                                  textInputPlaceholder:textPlaceholder ?: @""];
        }
        return [UNTextInputNotificationAction actionWithIdentifier:identifier
                                                             title:title
                                                           options:options
                                              textInputButtonTitle:textButtonTitle
                                              textInputPlaceholder:textPlaceholder ?: @""];
    }
    if (@available(iOS 15.0, *)) {
        return [UNNotificationAction actionWithIdentifier:identifier
                                                    title:title
                                                  options:options
                                                     icon:icon];
    }
    return [UNNotificationAction actionWithIdentifier:identifier title:title options:options];
}

// The category for an interaction, or nil if the payload is unusable.
static UNNotificationCategory *PPLEBuildCategory(NSDictionary *interaction) {
    NSString *categoryId = [kPPLECategoryPrefix stringByAppendingString:interaction[@"id"]];
    NSMutableArray<UNNotificationAction *> *actions = [NSMutableArray array];
    NSString *kind = interaction[@"kind"];

    if ([kind isEqualToString:@"reply"]) {
        if (!PPLEIsNonEmptyString(interaction[@"submitLabel"]) ||
            !PPLEIsNonEmptyString(interaction[@"actionId"])) {
            return nil;
        }
        NSString *placeholder = [interaction[@"placeholder"] isKindOfClass:[NSString class]]
                                    ? interaction[@"placeholder"]
                                    : @"";
        [actions addObject:PPLEMakeAction(interaction[@"actionId"],
                                          interaction[@"submitLabel"],
                                          interaction[@"icon"],
                                          NO,
                                          NO,
                                          interaction[@"submitLabel"],
                                          placeholder)];
    } else if ([kind isEqualToString:@"buttons"]) {
        NSArray *rawActions = interaction[@"actions"];
        if (![rawActions isKindOfClass:[NSArray class]]) {
            return nil;
        }
        NSMutableSet<NSString *> *seen = [NSMutableSet set];
        for (id rawAction in rawActions) {
            if (![rawAction isKindOfClass:[NSDictionary class]] ||
                !PPLEIsNonEmptyString(rawAction[@"id"]) ||
                !PPLEIsNonEmptyString(rawAction[@"label"]) ||
                [seen containsObject:rawAction[@"id"]]) {
                return nil;
            }
            [seen addObject:rawAction[@"id"]];
            // `bg: false` marks an action that opens the app (it has `confirm` or
            // `requires`), so it is `.foreground`.
            BOOL foreground = [rawAction[@"bg"] isKindOfClass:[NSNumber class]] && ![rawAction[@"bg"] boolValue];
            BOOL destructive = [rawAction[@"destructive"] isKindOfClass:[NSNumber class]] && [rawAction[@"destructive"] boolValue];
            [actions addObject:PPLEMakeAction(rawAction[@"id"],
                                              rawAction[@"label"],
                                              rawAction[@"icon"],
                                              destructive,
                                              foreground,
                                              nil,
                                              nil)];
        }
    } else {
        return nil;
    }
    if (actions.count == 0) {
        return nil;
    }
    return [UNNotificationCategory categoryWithIdentifier:categoryId
                                                  actions:actions
                                        intentIdentifiers:@[]
                                                  options:UNNotificationCategoryOptionNone];
}

// Merge `category` into the registered set, prune to the newest
// `kPPLEMaxCategories` `pple.ix.*`, and register the result. Returns NO, having
// registered nothing, if the existing set could not be read in time: writing the
// set back without it would wipe every other category.
static BOOL PPLERegisterCategory(UNNotificationCategory *category) {
    // Notifications in a burst are handled by instances of this class in the same
    // process, each doing a read-modify-write of the whole set. Serialise them.
    @synchronized([NotificationService class]) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
        __block NSSet<UNNotificationCategory *> *existing = nil;
        [center getNotificationCategoriesWithCompletionHandler:^(NSSet<UNNotificationCategory *> *categories) {
            existing = categories;
            dispatch_semaphore_signal(semaphore);
        }];
        if (dispatch_semaphore_wait(semaphore, dispatch_time(DISPATCH_TIME_NOW, kPPLECategoriesTimeoutSeconds * NSEC_PER_SEC)) != 0 ||
            existing == nil) {
            return NO;
        }

        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        NSArray *stored = [defaults arrayForKey:kPPLECategoryOrderKey];
        NSMutableArray<NSString *> *order = [NSMutableArray array];
        for (id entry in stored) {
            if (PPLEIsNonEmptyString(entry)) {
                [order addObject:entry];
            }
        }
        // Newest last. A repeat of the same notification moves to the end.
        [order removeObject:category.identifier];
        [order addObject:category.identifier];

        NSMutableDictionary<NSString *, UNNotificationCategory *> *ours = [NSMutableDictionary dictionary];
        NSMutableSet<UNNotificationCategory *> *merged = [NSMutableSet set];
        for (UNNotificationCategory *existingCategory in existing) {
            if ([existingCategory.identifier isEqualToString:category.identifier]) {
                continue;
            }
            if ([existingCategory.identifier hasPrefix:kPPLECategoryPrefix]) {
                ours[existingCategory.identifier] = existingCategory;
            } else {
                [merged addObject:existingCategory];
            }
        }
        ours[category.identifier] = category;

        // Oldest first: anything not in the order list (it was lost), then the list
        // from the front.
        NSMutableArray<NSString *> *oldestFirst = [NSMutableArray array];
        for (NSString *identifier in ours) {
            if (![order containsObject:identifier]) {
                [oldestFirst addObject:identifier];
            }
        }
        for (NSString *identifier in order) {
            if (ours[identifier] != nil) {
                [oldestFirst addObject:identifier];
            }
        }
        while (oldestFirst.count > kPPLEMaxCategories) {
            [ours removeObjectForKey:oldestFirst.firstObject];
            [oldestFirst removeObjectAtIndex:0];
        }
        [merged addObjectsFromArray:ours.allValues];

        [center setNotificationCategories:merged];
        [defaults setObject:oldestFirst forKey:kPPLECategoryOrderKey];

        // Read the set back before the caller displays: `setNotificationCategories:`
        // returns before iOS has necessarily committed it, and a notification shown
        // ahead of that has no actions (as OneSignal's extension also guards
        // against). Bounded by the same timeout. If the category is not there when
        // time runs out we still report success: the worst case is a notification
        // without actions, never a lost one.
        dispatch_semaphore_t committed = dispatch_semaphore_create(0);
        __block BOOL found = NO;
        [center getNotificationCategoriesWithCompletionHandler:^(NSSet<UNNotificationCategory *> *categories) {
            for (UNNotificationCategory *candidate in categories) {
                if ([candidate.identifier isEqualToString:category.identifier]) {
                    found = YES;
                    break;
                }
            }
            dispatch_semaphore_signal(committed);
        }];
        dispatch_semaphore_wait(committed, dispatch_time(DISPATCH_TIME_NOW, kPPLECategoriesTimeoutSeconds * NSEC_PER_SEC));
        if (!found) {
            NSLog(@"[NotificationService] category %@ not visible after registering", category.identifier);
        }
        return YES;
    }
}

// ---------------------------------------------------------------------------
// Notification image. FCM puts the image URL of an APNs push in
// `fcm_options.image`; this downloads it and attaches it, so iOS shows it as the
// notification's thumbnail. It does what `[FIRMessaging extensionHelper]` used to:
// Firebase's Apple SDK is only distributed through Swift Package Manager since
// v13, so the extension no longer links Firebase at all.
// ---------------------------------------------------------------------------

static NSURL *PPLEImageURL(NSDictionary *userInfo) {
    id options = userInfo[@"fcm_options"];
    if (![options isKindOfClass:[NSDictionary class]] || !PPLEIsNonEmptyString(options[@"image"])) {
        return nil;
    }
    NSURL *url = [NSURL URLWithString:options[@"image"]];
    return url.scheme.length > 0 ? url : nil;
}

// The file extension iOS needs to recognise the downloaded image: from the
// server's suggested file name, else from the MIME type.
static NSString *PPLEImageFileExtension(NSURLResponse *response) {
    NSString *extension = response.suggestedFilename.pathExtension;
    if (extension.length > 0) {
        return extension;
    }
    if (response.MIMEType.length > 0) {
        UTType *type = [UTType typeWithMIMEType:response.MIMEType];
        if (type.preferredFilenameExtension.length > 0) {
            return type.preferredFilenameExtension;
        }
    }
    return nil;
}

// Downloads `url` and calls back with an attachment, or nil if anything fails.
static void PPLELoadImageAttachment(NSURL *url, void (^completion)(UNNotificationAttachment *attachment)) {
    NSURLSessionDownloadTask *task = [[NSURLSession sharedSession]
        downloadTaskWithURL:url
          completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
            if (error != nil || location == nil) {
                NSLog(@"[NotificationService] could not download the image: %@", error);
                completion(nil);
                return;
            }
            NSString *extension = PPLEImageFileExtension(response);
            if (extension == nil) {
                NSLog(@"[NotificationService] the image has no recognisable type");
                completion(nil);
                return;
            }
            // The download is deleted when this handler returns, so move it first,
            // under a name that ends in the extension.
            NSURL *file = [[NSURL fileURLWithPath:NSTemporaryDirectory()]
                URLByAppendingPathComponent:[[NSUUID UUID].UUIDString stringByAppendingPathExtension:extension]];
            NSError *moveError = nil;
            if (![[NSFileManager defaultManager] moveItemAtURL:location toURL:file error:&moveError]) {
                NSLog(@"[NotificationService] could not keep the image: %@", moveError);
                completion(nil);
                return;
            }
            NSError *attachmentError = nil;
            UNNotificationAttachment *attachment = [UNNotificationAttachment attachmentWithIdentifier:@""
                                                                                                 URL:file
                                                                                             options:nil
                                                                                               error:&attachmentError];
            if (attachment == nil) {
                NSLog(@"[NotificationService] could not attach the image: %@", attachmentError);
            }
            completion(attachment);
          }];
    [task resume];
}

@interface NotificationService ()

@property (nonatomic, strong) void (^contentHandler)(UNNotificationContent *contentToDeliver);
@property (nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;
@property (nonatomic) BOOL delivered;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request withContentHandler:(void (^)(UNNotificationContent * _Nonnull))contentHandler {
    self.contentHandler = contentHandler;
    self.bestAttemptContent = [request.content mutableCopy];

    // Interactive notification: register its category before the system shows it.
    // This must come before the image download, which may take a while, and any
    // failure leaves the notification as it was.
    @try {
        NSDictionary *interaction = PPLEParseInteraction(request.content.userInfo);
        if (interaction) {
            UNNotificationCategory *category = PPLEBuildCategory(interaction);
            if (category && PPLERegisterCategory(category)) {
                self.bestAttemptContent.categoryIdentifier = category.identifier;
            }
        }
    } @catch (NSException *exception) {
        NSLog(@"[NotificationService] could not register the interaction category: %@", exception);
    }

    NSURL *imageURL = PPLEImageURL(request.content.userInfo);
    if (imageURL == nil) {
        [self deliver];
        return;
    }
    __weak NotificationService *weakSelf = self;
    PPLELoadImageAttachment(imageURL, ^(UNNotificationAttachment *attachment) {
        NotificationService *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        @synchronized(strongSelf) {
            if (attachment != nil && !strongSelf.delivered) {
                strongSelf.bestAttemptContent.attachments = @[attachment];
            }
        }
        [strongSelf deliver];
    });
}

// Hands the content to iOS once only: the download and the expiry below race.
- (void)deliver {
    @synchronized(self) {
        if (self.delivered) {
            return;
        }
        self.delivered = YES;
    }
    self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    [self deliver];
}

@end
