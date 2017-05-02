import React from 'react';
import Helper from 'babel/utils/helper/Helper';
import LazyImage from 'babel/components/helper/lazyImage/LazyImage';
import Autolinker from 'babel/components/helper/autolinker/Autolinker';
import viewerText from 'i18n!translations/viewer/nls/template';
import builderText from 'mode!isBuilder?i18n!translations/builder/nls/template';

export default class SelectedShares extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      mediaLoaded: false
    };

    // autobind methods
    this.getMedia = this.getMedia.bind(this);
    this.onMediaLoad = this.onMediaLoad.bind(this);
    this.getFieldLayout = this.getFieldLayout.bind(this);
  }

  componentDidUpdate(nextProps) {
    if (this.props.feature[this.props.attributePath][this.props.layer.objectIdField] !== nextProps.feature[nextProps.attributePath][nextProps.layer.objectIdField]) {
      this.setState({
        mediaLoaded: false
      });
    }
  }

  render() {

    const mainClasses = Helper.classnames([this.props.className,this.props.classNames,'selected-display']);
    const attributes = this.props.feature[this.props.attributePath];

    return (
      <div className={mainClasses} onScroll={this.props.onScroll}>
        { this.getMedia() }
        { this.state.mediaLoaded ? (this.state.mediaLoaded === 'failed' ?
          (
            <div className="padded-column">
            <div className="info-section">
              <div className="review-section alert alert-danger">
                {viewerText.errors.selectedDisplay.noPhoto}
              </div>
              <h4 className="share-title">{attributes[this.props.primaryField]}</h4>
              <p className="share-location-wrapper"><small className="share-location">{attributes[this.props.secondaryField]}</small></p>
            { this.props.displayOrder.map(this.getFieldLayout.bind(this,attributes))}
            </div>
            {this.props.reviewEnabled ? (
              <div className="review-section alert alert-info">
                <h6 className="review-header">{builderText.review.selectedShare.header}</h6>
                <div className="btn-group">
                  <button type="button" className={Helper.classnames(['btn'],{
                      'btn-default': attributes[this.props.vettedField] !== 1,
                      'btn-primary': attributes[this.props.vettedField] === 1
                    })} onClick={this.props.approveAction.bind(null,attributes[this.props.idField])}>{viewerText.selectedShares.review.options.approve}</button>
                  <button type="button" className={Helper.classnames(['btn'],{
                      'btn-default': attributes[this.props.vettedField] !== 2,
                      'btn-danger': attributes[this.props.vettedField] === 2
                    })} onClick={this.props.rejectAction.bind(null,attributes[this.props.idField])}>{viewerText.selectedShares.review.options.reject}</button>
                </div>
              </div>
            ) : null}
            </div>
          ) : (
          <div className="padded-column">
          <div className="info-section">
            <h4 className="share-title">{attributes[this.props.primaryField]}</h4>
            <p className="share-location-wrapper"><small className="share-location">{attributes[this.props.secondaryField]}</small></p>
            { this.props.displayOrder.map(this.getFieldLayout.bind(this,attributes))}
            <h4>Compassion Impact</h4>
            <ul className="compassion-impact-list">
              { this.props.tableDisplay.map(this.getTableLayout.bind(this, attributes))}
            </ul>
          </div>
          {this.props.reviewEnabled ? (
            <div className="review-section alert alert-info">
              <h6 className="review-header">{builderText.review.selectedShare.header}</h6>
              <div className="btn-group">
                <button type="button" className={Helper.classnames(['btn'],{
                    'btn-default': attributes[this.props.vettedField] !== 1,
                    'btn-primary': attributes[this.props.vettedField] === 1
                  })} onClick={this.props.approveAction.bind(null,attributes[this.props.idField])}>{viewerText.selectedShares.review.options.approve}</button>
                <button type="button" className={Helper.classnames(['btn'],{
                    'btn-default': attributes[this.props.vettedField] !== 2,
                    'btn-danger': attributes[this.props.vettedField] === 2
                  })} onClick={this.props.rejectAction.bind(null,attributes[this.props.idField])}>{viewerText.selectedShares.review.options.reject}</button>
              </div>
            </div>
          ) : null}
          </div>
        )) : (
          <div className="loading">
            <img className="loading-gif" src="resources/images/loader-light.gif" alt={viewerText.loading.general} />
            <p>{viewerText.loading.general}</p>
          </div>
        ) }
      </div>
    );
  }

  getMedia() {
    const media = this.props.media;
    const attributes = this.props.feature[this.props.attributePath];
    const fieldProps = this.props.fields[media.field];

    switch (media.type) {
      case 'video':
        // add video
        break;
      default:
        let photoUrl;

        if (fieldProps.isAttachment) {
          const attachmentUrl = Helper.attachmentUtils.getAttachmentUrlsByStringMatch({
            layer: this.props.layer,
            feature: this.props.feature,
            match: media.field,
            position: 0
          })[0] || '';

          photoUrl = Helper.attachmentUtils.checkForCredential({
            url: attachmentUrl,
            layer: this.props.layer
          });
        } else {
          photoUrl = Helper.attachmentUtils.checkForCredential({
            url: this.props.thumbnailUrlPrepend + attributes[media.field] + this.props.thumbnailUrlAppend,
            layer: this.props.layer
          });
        }

        return (
          <div className="media-section">
            <LazyImage
              key={photoUrl}
              className="media-photo"
              autoSizeDiv={true}
              src={photoUrl}
              onLoad={this.onMediaLoad.bind(this,true)}
              onError={this.onMediaLoad.bind(this,false)}>
            </LazyImage>
          </div>
        );
    }
  }

  onMediaLoad(success) {
    this.setState({
      mediaLoaded: success ? true : 'failed'
    });
  }

  getTableLayout(attributes,current) {
    // replace this later...
    let fieldMap = { "numParticipants": "Volunteers/Players",
      "hoursServed": "Hours Served",
      "peopleServed": "People Served",
      "moniesRaised": "Monies Raised"
    };

    if (typeof current === 'string' && attributes[current] !== null && +attributes[current] > 0) {
      return (
        <li key={current}><span className="key">{fieldMap[current]}</span>: <span className="value">{attributes[current]}</span></li>
      );
    }
  }

  getFieldLayout(attributes,current) {

      if (typeof current === 'string') {
        const fieldClasses = Helper.classnames(['field-display', 'field-' + current]);
        const fieldProps = this.props.fields[current];

        if (fieldProps && current === 'videoURL' && attributes[current]) {
          return (<a href={attributes[current]} target="_blank" key={current} className={fieldClasses}>View Link</a>);
        }

        if (fieldProps && fieldProps.type === 'textarea') {
          return (<Autolinker key={current} className={fieldClasses} text={attributes[current]}></Autolinker>);
        } else {
          return (<p key={current} className={fieldClasses}>{attributes[current]}</p>);
        }
      }
  }

}

SelectedShares.propTypes = {
  reviewEnabled: React.PropTypes.bool,
  approveAction: React.PropTypes.func,
  rejectAction: React.PropTypes.func,
  feature: React.PropTypes.shape({
    attributes: React.PropTypes.shape({})
  }),
  displayOrder: React.PropTypes.array,
  tableDisplay: React.PropTypes.array,
  attributePath: React.PropTypes.string.isRequired,
  idField: React.PropTypes.string.isRequired,
  primaryField: React.PropTypes.string.isRequired,
  secondaryField: React.PropTypes.string.isRequired,
  vettedField: React.PropTypes.string,
  media: React.PropTypes.shape({
    type: React.PropTypes.string,
    field: React.PropTypes.string
  }),
  thumbnailUrlPrepend: React.PropTypes.string,
  thumbnailUrlAppend: React.PropTypes.string,
  layer: React.PropTypes.oneOfType([
    React.PropTypes.shape({
      url: React.PropTypes.string,
      credential: React.PropTypes.shape({
        server: React.PropTypes.string,
        token: React.PropTypes.string
      })
    }),
    React.PropTypes.bool
  ])
};

SelectedShares.defaultProps = {
  feature: {
    attributes: {}
  },
  displayOrder: [],
  tableDisplay: [],
  thumbnailUrlPrepend: '',
  thumbnailUrlAppend: '',
  reviewEnabled: false,
  approveAction: () => {},
  rejectAction: () => {}
};
