# errors-constants (kering.py)

## Error Hierarchy

KeriError (Exception)
 ClosedError, ConfigurationError, ExchangeError, InvalidEventTypeError, MissingAidError, InvalidGroupError, GroupFormationError, MissingChainError, RevokedChainError, MissingSchemaError, FailedSchemaValidationError, UntrustedKeyStateSource, QueryNotFoundError
 AuthError > AuthNError, AuthZError > DecryptError
 DatabaseError > MissingEntryError
 MaterialError > RawMaterialError, SoftMaterialError, EmptyMaterialError, InvalidVersionError, InvalidCodeError, InvalidSoftError, InvalidTypeError, InvalidValueError, InvalidSizeError > InvalidCodeSizeError, InvalidVarIndexError, InvalidVarSizeError, InvalidVarRawSizeError
 SerializeError
 ValidationError > MissingFieldError, ExtraFieldError, AlternateFieldError, MissingSignatureError, MissingDestinationError, MissingWitnessSignatureError, MissingDelegationError, OutOfOrderError, LikelyDuplicitousError, UnverifiedWitnessReceiptError, UnverifiedReceiptError, UnverifiedTransferableReceiptError, DerivationError, UnverifiedReplyError, EmptyListError, MissingAnchorError, MissingRegistryError, MissingIssuerError, InvalidCredentialStateError, UnverifiedProofError, OutOfOrderKeyStateError, OutOfOrderTxnStateError, MisfitEventSourceError, MissingDelegableApprovalError
 ExtractionError > ShortageError, ColdStartError, SizedGroupError, TopLevelStreamError, VersionError, ProtocolError, KindError, IlkError, ConversionError, DeserializeError > FieldError, ElementError; DerivationCodeError > UnexpectedCodeError, UnexpectedCountCodeError, UnexpectedOpCodeError

## Codex Classes

Frozen dataclasses with string/int constants (-Dex suffix singleton):
ColdCodex/ColdDex (tritets 0o0-0o7 mapping to Colds.ano/txt/msg/bny), TraitCodex/TraitDex (EstOnly, DoNotDelegate, RegistrarBackers, NoBackers, NoRegistrarBackers, DelegateIsDelegator)

## Namedtuples

Kindage(json mgpk cbor cesr), Protocolage(keri acdc), Versionage(major minor), Smellage(proto pvrsn kind size gvrsn), Coldage(msg txt bny ano), Schemage(tcp http https), Rolage(controller witness registrar gateway watcher judge juror peer mailbox agent indexer), Ilkage(icp rot ixn dip drt rct qry rpy xip exn pro bar vcp vrt iss rev bis brv rip bup upd acm act acg ace sch att agg edg rul)

## Singletons

Kinds, Protocols, Colds, Schemes, Roles, Ilks -- namedtuple instances with string values matching field names. Vrsn_1_0=Versionage(1,0), Vrsn_2_0=Versionage(2,0).

## Ilks

icp/rot/drt/dip: establishment. ixn: non-establishment. rct: receipt. qry/rpy: query/reply. exn: exchange. vcp/vrt: registry. iss/rev/bis/brv: credential issuance/revocation.

## Version Strings

V1 (major<2): 17 chars, hex sizes, underscore term. V2 (major==2): 19 chars, Base64 sizes, dot term, adds genus version.

## Constants

MaxON=int("f"*32,16). SEPARATOR="\r\n\r\n". SMELLSIZE=27. VER1FULLSPAN=17. VER2FULLSPAN=19.

## Key Functions

sniff(ims) returns cold start type. versify(proto,pvrsn,kind,size) builds version string. deversify(vs) parses it. smell(raw) extracts version from buffer.
